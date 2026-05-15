(function() {
    const adminToastStyles = `
    .toast-container {
        position: fixed;
        bottom: 30px;
        right: 30px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .toast {
        background: #1a1f1f;
        color: #ffffff;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        border-left: 4px solid #007a7a;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
        font-weight: 500;
        min-width: 280px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        animation: toastIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        transition: all 0.3s ease;
    }
    .toast.success { 
        border-left-color: #2dd4bf; 
    }
    .toast.error { 
        border-left-color: #ff4444; 
    }
    .toast.info { 
        border-left-color: #007a7a; 
    }

    @keyframes toastIn {
        from { 
        opacity: 0; transform: translateX(50px); 
        }
        to { 
        opacity: 1; transform: translateX(0); 
        }
    }
    @keyframes toastOut {
        from { 
        opacity: 1; transform: translateX(0); 
        }
        to { 
        opacity: 0; transform: translateX(50px); 
        }
    }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = adminToastStyles;
    document.head.appendChild(styleSheet);

    const container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'admin-toast-container';
    document.body.appendChild(container);

    window.showAdminToast = function(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '✅';
        if (type === 'error') icon = '❌';
        if (type === 'info')  icon = 'ℹ️';

        toast.innerHTML = `<span>${icon} &nbsp; ${message}</span>`;
        
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    };
})();
