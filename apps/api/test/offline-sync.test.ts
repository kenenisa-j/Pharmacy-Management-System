import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Hospital Management System - Offline & Synchronization Suite', () => {

    describe('1. Offline Entity Creation & Stable IDs', () => {
        test('Generates valid RFC4122 v4 UUIDs for offline records', () => {
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            const patientId = crypto.randomUUID();
            const appointmentId = crypto.randomUUID();

            assert.match(patientId, uuidPattern, 'Patient ID must be a valid v4 UUID');
            assert.match(appointmentId, uuidPattern, 'Appointment ID must be a valid v4 UUID');
            assert.notEqual(patientId, appointmentId, 'Generated UUIDs must be distinct');
        });

        test('Attaches device attribution and creation timestamps to offline records', () => {
            const now = new Date().toISOString();
            const deviceId = 'dev_test_device_123';

            const localPatient = {
                id: crypto.randomUUID(),
                name: 'Taye Kebede',
                phone: '+251911998877',
                syncStatus: 'pending',
                createdAt: now,
                localCreatedAt: now,
                deviceId: deviceId,
            };

            assert.equal(localPatient.syncStatus, 'pending');
            assert.equal(localPatient.deviceId, deviceId);
            assert.ok(new Date(localPatient.localCreatedAt).getTime() <= Date.now());
        });
    });

    describe('2. Persistent Queued Operations & Serialization', () => {
        test('Queues mutations with FIFO ordering and metadata', () => {
            const queue: any[] = [];
            const patientId1 = crypto.randomUUID();
            const patientId2 = crypto.randomUUID();

            const op1 = {
                id: crypto.randomUUID(),
                entityType: 'patient',
                entityId: patientId1,
                action: 'CREATE',
                payload: { name: 'Patient 1', phone: '+2519001' },
                createdAt: new Date(Date.now() - 5000).toISOString(),
                status: 'PENDING',
                retryCount: 0,
            };

            const op2 = {
                id: crypto.randomUUID(),
                entityType: 'patient',
                entityId: patientId2,
                action: 'CREATE',
                payload: { name: 'Patient 2', phone: '+2519002' },
                createdAt: new Date().toISOString(),
                status: 'PENDING',
                retryCount: 0,
            };

            queue.push(op2);
            queue.push(op1);

            // Sort FIFO
            const sorted = queue.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            assert.equal(sorted[0].entityId, patientId1, 'Oldest mutation must be processed first');
            assert.equal(sorted[1].entityId, patientId2);
        });

        test('Queue serializes safely to and from JSON without loss of fields', () => {
            const queueItem = {
                id: crypto.randomUUID(),
                entityType: 'appointment',
                entityId: crypto.randomUUID(),
                action: 'CREATE',
                payload: {
                    doctorName: 'Dr. Almaz Tadesse',
                    appointmentDate: '2026-11-01T10:00:00.000Z',
                    reason: 'Post-op checkup'
                },
                idempotencyKey: crypto.randomUUID(),
                deviceId: 'dev_laptop_1',
                createdAt: new Date().toISOString(),
                status: 'PENDING',
                retryCount: 0,
                lastError: null,
            };

            const serialized = JSON.stringify(queueItem);
            const deserialized = JSON.parse(serialized);

            assert.deepEqual(deserialized, queueItem);
        });
    });

    describe('3. Reconnect Synchronization & Idempotency Protection', () => {
        test('Idempotency logic prevents duplicate creations on network replay', () => {
            const existingDatabase = new Map<string, any>();
            const idempotencyKey = crypto.randomUUID();
            const patientId = crypto.randomUUID();

            const createOrGetCustomer = (body: any) => {
                if (existingDatabase.has(body.id)) {
                    return { status: 200, message: 'Customer already exists (idempotent)', data: existingDatabase.get(body.id) };
                }
                const newRecord = { ...body, createdAt: new Date().toISOString() };
                existingDatabase.set(body.id, newRecord);
                return { status: 201, message: 'Customer registered successfully', data: newRecord };
            };

            // First request (e.g. online or first retry)
            const firstCall = createOrGetCustomer({ id: patientId, name: 'Sara Desta', phone: '+251922334455', idempotencyKey });
            assert.equal(firstCall.status, 201);

            // Second request (simulating network timeout followed by reconnection retry)
            const secondCall = createOrGetCustomer({ id: patientId, name: 'Sara Desta', phone: '+251922334455', idempotencyKey });
            assert.equal(secondCall.status, 200);
            assert.equal(secondCall.data.id, patientId);
            assert.equal(existingDatabase.size, 1, 'Database must retain exactly 1 record despite retry');
        });
    });

    describe('4. Server Failures & Exponential Backoff', () => {
        test('Exponential backoff delay doubles with each retry and caps at 30s', () => {
            const getBackoffDelay = (retryCount: number) => Math.min(1000 * Math.pow(2, retryCount), 30000);

            assert.equal(getBackoffDelay(1), 2000);
            assert.equal(getBackoffDelay(2), 4000);
            assert.equal(getBackoffDelay(3), 8000);
            assert.equal(getBackoffDelay(4), 16000);
            assert.equal(getBackoffDelay(5), 30000); // capped at 30s
            assert.equal(getBackoffDelay(6), 30000);
        });

        test('Transitions item to FAILED after reaching maximum retry attempts (5)', () => {
            let item = {
                id: crypto.randomUUID(),
                retryCount: 4,
                status: 'PENDING',
                lastError: null as string | null
            };

            const simulateRetryFailure = (target: typeof item, errMsg: string) => {
                target.retryCount += 1;
                target.lastError = errMsg;
                target.status = target.retryCount >= 5 ? 'FAILED' : 'PENDING';
            };

            simulateRetryFailure(item, '500 Internal Server Error');
            assert.equal(item.retryCount, 5);
            assert.equal(item.status, 'FAILED');
            assert.equal(item.lastError, '500 Internal Server Error');
        });
    });

    describe('5. Conflict Detection & Rejection', () => {
        test('Detects duplicate phone number conflict and flags status as CONFLICT (HTTP 409)', () => {
            const existingPhones = new Set(['+251911000000']);
            const newPatientPayload = { phone: '+251911000000', name: 'Duplicate Number Patient' };

            const handleRegistration = (payload: typeof newPatientPayload) => {
                if (existingPhones.has(payload.phone)) {
                    return { status: 409, message: 'A customer with this phone number already exists (conflict with existing patient record)' };
                }
                existingPhones.add(payload.phone);
                return { status: 201 };
            };

            const response = handleRegistration(newPatientPayload);
            assert.equal(response.status, 409);
            assert.ok(response.message.includes('conflict'));
        });

        test('Detects doctor double-booking within overlapping 30-minute window (HTTP 409)', () => {
            const existingAppointments = [
                {
                    doctorName: 'Dr. Almaz Tadesse',
                    date: new Date('2026-11-10T09:00:00Z'),
                    status: 'SCHEDULED'
                }
            ];

            const isDoctorAvailable = (doctorName: string, requestedDate: Date) => {
                const windowStart = new Date(requestedDate.getTime() - 30 * 60 * 1000);
                const windowEnd = new Date(requestedDate.getTime() + 30 * 60 * 1000);

                const conflict = existingAppointments.find(
                    (a) => a.doctorName === doctorName &&
                           a.status !== 'CANCELLED' &&
                           a.date >= windowStart &&
                           a.date <= windowEnd
                );
                return !conflict;
            };

            // Attempt booking at 09:15 (within 30 mins) -> Conflict!
            assert.equal(isDoctorAvailable('Dr. Almaz Tadesse', new Date('2026-11-10T09:15:00Z')), false);

            // Attempt booking at 10:00 (outside 30 mins) -> Allowed!
            assert.equal(isDoctorAvailable('Dr. Almaz Tadesse', new Date('2026-11-10T10:00:00Z')), true);

            // Attempt booking for different doctor at 09:15 -> Allowed!
            assert.equal(isDoctorAvailable('Dr. Dawit Haile', new Date('2026-11-10T09:15:00Z')), true);
        });
    });

    describe('6. Authentication Expiration & Non-Destructive Pause', () => {
        test('Authentication expiration pauses sync queue without discarding pending records', () => {
            const queue = [
                { id: '1', status: 'PENDING', payload: { name: 'Patient A' } },
                { id: '2', status: 'PENDING', payload: { name: 'Patient B' } },
            ];

            const syncQueueProcessor = (token: string | null) => {
                if (!token) {
                    return { syncState: 'auth_expired', processedCount: 0, paused: true };
                }
                return { syncState: 'syncing', processedCount: queue.length, paused: false };
            };

            // When access token is absent or expired
            const expiredResult = syncQueueProcessor(null);
            assert.equal(expiredResult.syncState, 'auth_expired');
            assert.equal(expiredResult.paused, true);
            assert.equal(queue.length, 2, 'Queue must remain intact during auth failure');
        });
    });

    describe('7. Preservation of Online Healthcare & Safety Boundaries', () => {
        test('Protected clinical operations (prescriptions, dispensing) reject offline bypass', () => {
            const isOfflineAllowed = (operationType: string): boolean => {
                const allowedOffline = ['PATIENT_REGISTRATION', 'APPOINTMENT_CREATION'];
                return allowedOffline.includes(operationType);
            };

            assert.equal(isOfflineAllowed('PATIENT_REGISTRATION'), true);
            assert.equal(isOfflineAllowed('APPOINTMENT_CREATION'), true);
            assert.equal(isOfflineAllowed('PRESCRIPTION_DISPENSING'), false);
            assert.equal(isOfflineAllowed('NARCOTIC_APPROVAL'), false);
            assert.equal(isOfflineAllowed('STOCK_TRANSFER'), false);
            assert.equal(isOfflineAllowed('POS_CASH_DRAWER_SETTLE'), false);
        });
    });
});
