// Web Push Notification Client
// Handles service worker registration, push subscription, and notification permissions

const PushNotifications = (function() {
    'use strict';

    let serviceWorkerRegistration = null;
    let vapidPublicKey = null;

    // Check if push notifications are supported
    function isSupported() {
        return 'serviceWorker' in navigator &&
               'PushManager' in window &&
               'Notification' in window;
    }

    // Convert base64 VAPID key to Uint8Array
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Initialize service worker
    async function initServiceWorker() {
        if (!isSupported()) {
            console.log('[Push] Push notifications are not supported');
            return false;
        }

        try {
            // Register service worker
            serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('[Push] Service Worker registered:', serviceWorkerRegistration);

            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;
            console.log('[Push] Service Worker ready');

            return true;
        } catch (error) {
            console.error('[Push] Service Worker registration failed:', error);
            return false;
        }
    }

    // Get VAPID public key from server
    async function getVapidPublicKey() {
        if (vapidPublicKey) {
            return vapidPublicKey;
        }

        try {
            const response = await fetch('/api/push/public-key');
            const data = await response.json();
            vapidPublicKey = data.publicKey;
            return vapidPublicKey;
        } catch (error) {
            console.error('[Push] Error fetching VAPID public key:', error);
            throw error;
        }
    }

    // Request notification permission
    async function requestPermission() {
        if (!isSupported()) {
            return 'denied';
        }

        try {
            const permission = await Notification.requestPermission();
            console.log('[Push] Notification permission:', permission);
            return permission;
        } catch (error) {
            console.error('[Push] Error requesting permission:', error);
            return 'denied';
        }
    }

    // Subscribe to push notifications
    async function subscribe() {
        if (!isSupported()) {
            throw new Error('Push notifications are not supported');
        }

        try {
            // Check if already subscribed
            const existingSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
            if (existingSubscription) {
                console.log('[Push] Already subscribed:', existingSubscription);
                // Send to server anyway to ensure it's registered
                await sendSubscriptionToServer(existingSubscription);
                return existingSubscription;
            }

            // Get VAPID public key
            const publicKey = await getVapidPublicKey();
            const applicationServerKey = urlBase64ToUint8Array(publicKey);

            // Subscribe to push notifications
            const subscription = await serviceWorkerRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });

            console.log('[Push] Subscribed to push notifications:', subscription);

            // Send subscription to server
            await sendSubscriptionToServer(subscription);

            return subscription;
        } catch (error) {
            console.error('[Push] Error subscribing to push notifications:', error);
            throw error;
        }
    }

    // Send subscription to server
    async function sendSubscriptionToServer(subscription) {
        try {
            const subscriptionJson = subscription.toJSON();
            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    endpoint: subscriptionJson.endpoint,
                    keys: {
                        auth: subscriptionJson.keys.auth,
                        p256dh: subscriptionJson.keys.p256dh
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send subscription to server');
            }

            const data = await response.json();
            console.log('[Push] Subscription sent to server:', data);
            return data;
        } catch (error) {
            console.error('[Push] Error sending subscription to server:', error);
            throw error;
        }
    }

    // Unsubscribe from push notifications
    async function unsubscribe() {
        if (!serviceWorkerRegistration) {
            return false;
        }

        try {
            const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
            if (!subscription) {
                console.log('[Push] No subscription to unsubscribe from');
                return true;
            }

            // Unsubscribe on client
            await subscription.unsubscribe();
            console.log('[Push] Unsubscribed from push notifications');

            // Remove subscription from server
            await fetch('/api/push/unsubscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    endpoint: subscription.endpoint
                })
            });

            return true;
        } catch (error) {
            console.error('[Push] Error unsubscribing:', error);
            return false;
        }
    }

    // Get current subscription status
    async function getSubscriptionStatus() {
        if (!serviceWorkerRegistration) {
            return {
                supported: isSupported(),
                permission: Notification.permission,
                subscribed: false
            };
        }

        try {
            const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
            return {
                supported: isSupported(),
                permission: Notification.permission,
                subscribed: subscription !== null,
                subscription: subscription
            };
        } catch (error) {
            console.error('[Push] Error getting subscription status:', error);
            return {
                supported: isSupported(),
                permission: Notification.permission,
                subscribed: false,
                error: error.message
            };
        }
    }

    // Initialize and request permission (called on user action)
    async function init() {
        if (!isSupported()) {
            console.log('[Push] Push notifications are not supported');
            return { success: false, error: 'not_supported' };
        }

        try {
            // Initialize service worker
            const swInitialized = await initServiceWorker();
            if (!swInitialized) {
                return { success: false, error: 'sw_failed' };
            }

            // Request permission
            const permission = await requestPermission();
            if (permission !== 'granted') {
                return { success: false, error: 'permission_denied', permission };
            }

            // Subscribe to push
            await subscribe();

            return { success: true, permission };
        } catch (error) {
            console.error('[Push] Initialization error:', error);
            return { success: false, error: error.message };
        }
    }

    // Public API
    return {
        isSupported,
        init,
        requestPermission,
        subscribe,
        unsubscribe,
        getSubscriptionStatus,
        initServiceWorker
    };
})();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PushNotifications;
}
