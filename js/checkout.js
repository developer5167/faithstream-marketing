const API_BASE = 'https://api.faithstream.sotersystems.in/api';

document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('login-modal');
    const loaderOverlay = document.getElementById('loader-overlay');
    const loginForm = document.getElementById('login-form');
    const btnGoPremium = document.getElementById('btn-go-premium');
    const closeModal = document.querySelector('.close-modal');
    const loginError = document.getElementById('login-error');
    
    // Auth UI Elements
    const authBtn = document.getElementById('auth-btn');
    const userDisplay = document.getElementById('user-display');

    // State
    let isLoginForPremium = false;

    // -- Initialization --
    updateAuthUI();

    // -- Event Listeners --

    // 1. Open Modal / Start Flow
    btnGoPremium.addEventListener('click', () => {
        const token = localStorage.getItem('fs_token');
        const user = JSON.parse(localStorage.getItem('fs_user') || '{}');
        
        if (token) {
            if (user.is_premium) {
                alert('You are already a Premium member! Enjoy your worship.');
            } else {
                startCheckout(token);
            }
        } else {
            isLoginForPremium = true;
            loginModal.classList.add('active');
        }
    });

    // 2. Auth Button (Login/Logout)
    authBtn.addEventListener('click', () => {
        const token = localStorage.getItem('fs_token');
        if (token) {
            // Logout
            localStorage.removeItem('fs_token');
            localStorage.removeItem('fs_user');
            updateAuthUI();
            location.reload(); 
        } else {
            // Open Login
            isLoginForPremium = false;
            loginModal.classList.add('active');
        }
    });

    // 3. Close Modal
    closeModal.addEventListener('click', () => {
        loginModal.classList.remove('active');
        loginError.style.display = 'none';
        isLoginForPremium = false;
    });

    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.remove('active');
            loginError.style.display = 'none';
            isLoginForPremium = false;
        }
    });

    // 4. Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        showLoader(true);
        loginError.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.token) {
                localStorage.setItem('fs_token', data.token);
                
                // Fetch full profile and subscription status
                const subStatus = await fetchSubscriptionStatus(data.token);
                
                const userData = {
                    ...data.user,
                    is_premium: subStatus.is_active
                };
                localStorage.setItem('fs_user', JSON.stringify(userData));
                
                loginModal.classList.remove('active');
                await updateAuthUI();
                
                // Only start checkout if triggered by "Go Premium" AND user is not already premium
                if (isLoginForPremium && !subStatus.is_active) {
                    startCheckout(data.token);
                } else {
                    showLoader(false);
                    if (isLoginForPremium && subStatus.is_active) {
                        alert('You are already a Premium member!');
                    }
                }
                isLoginForPremium = false;
            } else {
                throw new Error(data.error || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            loginError.textContent = err.message;
            loginError.style.display = 'block';
            showLoader(false);
        }
    });

    // -- Functions --

    async function fetchSubscriptionStatus(token) {
        try {
            const response = await fetch(`${API_BASE}/subscriptions/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            return data.subscription || { is_active: false };
        } catch (e) {
            console.error('Failed to fetch subscription status', e);
            return { is_active: false };
        }
    }

    async function updateAuthUI() {
        const token = localStorage.getItem('fs_token');
        let user = JSON.parse(localStorage.getItem('fs_user') || 'null');

        if (token) {
            // Re-sync subscription status in background if needed
            if (!user || user.is_premium === undefined) {
                const subStatus = await fetchSubscriptionStatus(token);
                if (user) {
                    user.is_premium = subStatus.is_active;
                    localStorage.setItem('fs_user', JSON.stringify(user));
                }
            }

            authBtn.textContent = 'Logout';
            if (user && user.name) {
                const premiumBadge = user.is_premium ? '<i class="fas fa-crown" style="color: #FFD700; margin-left: 8px;" title="Premium Member"></i>' : '';
                userDisplay.innerHTML = `Hi, ${user.name.split(' ')[0]}${premiumBadge}`;
                userDisplay.style.display = 'inline-block';
            }

            // Update Premium Card
            if (user && user.is_premium) {
                btnGoPremium.textContent = 'Premium Active';
                btnGoPremium.classList.add('btn-disabled');
                btnGoPremium.style.background = 'rgba(255, 255, 255, 0.1)';
                btnGoPremium.style.color = 'rgba(255, 255, 255, 0.5)';
                btnGoPremium.style.cursor = 'default';
                
                const premiumCard = btnGoPremium.parentElement; // pricing-card
                if (premiumCard) {
                    const priceEl = premiumCard.querySelector('.price');
                    if (priceEl) {
                        priceEl.innerHTML = '<span style="color: #FFD700; font-size: 1.5rem;"><i class="fas fa-crown"></i> Active Member</span>';
                    }
                }
            }
        } else {
            authBtn.textContent = 'Login';
            userDisplay.style.display = 'none';
        }
    }

    async function startCheckout(token) {
        showLoader(true);
        try {
            const response = await fetch(`${API_BASE}/subscriptions/create-order`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showLoader(false);
                openRazorpay(data);
            } else {
                if (response.status === 401) {
                    localStorage.removeItem('fs_token');
                    localStorage.removeItem('fs_user');
                    updateAuthUI();
                    loginModal.classList.add('active');
                }
                throw new Error(data.message || 'Failed to create payment order.');
            }
        } catch (err) {
            alert(err.message);
            showLoader(false);
        }
    }

    function openRazorpay(orderData) {
        const user = JSON.parse(localStorage.getItem('fs_user') || '{}');
        const options = {
            "key": orderData.key_id,
            "amount": orderData.amount,
            "currency": orderData.currency || "INR",
            "name": "FaithStream Premium",
            "description": "1 Month Ad-Free Subscription",
            "order_id": orderData.order_id,
            "handler": async function (response) {
                showLoader(true);
                try {
                    const token = localStorage.getItem('fs_token');
                    const vResponse = await fetch(`${API_BASE}/subscriptions/verify-payment`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    });
                    
                    const vData = await vResponse.json();
                    if (vResponse.ok && vData.success) {
                        // Update local user status
                        const user = JSON.parse(localStorage.getItem('fs_user') || '{}');
                        user.is_premium = true;
                        localStorage.setItem('fs_user', JSON.stringify(user));
                        
                        showLoader(false);
                        alert('🎉 Premium activated successfully!');
                        updateAuthUI();
                        
                        // Redirect back to app
                        window.location.href = 'faithstream://subscription';
                    } else {
                        throw new Error('Verification failed');
                    }
                } catch (err) {
                    alert('Error verifying payment: ' + err.message);
                    showLoader(false);
                }
            },
            "prefill": {
                "name": user.name || "",
                "email": user.email || "",
            },
            "theme": { "color": "#8B5CF6" },
            "modal": {
                "ondismiss": function() {
                    showLoader(false);
                }
            }
        };
        const rzp = new Razorpay(options);
        rzp.open();
    }

    function showLoader(show) {
        loaderOverlay.style.display = show ? 'flex' : 'none';
        if (show) loaderOverlay.classList.add('active');
        else loaderOverlay.classList.remove('active');
    }
});
