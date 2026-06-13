const UI = {
    // 加载动画
    showLoader: () => {
        document.querySelector('.loader-overlay').style.display = 'flex';
    },
    hideLoader: () => {
        document.querySelector('.loader-overlay').style.display = 'none';
    },

    // 提示框
    toast: (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast-tech ${type === 'error' ? 'error' : ''}`;
        toast.innerHTML = `<i class="bi bi-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${message}`;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('active'), 100);
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    },

    confirm: (title, message, callback) => {
        UI.confirmDanger(title, message, false, callback);
    },

    confirmDanger: (title, message, isDanger, callback) => {
        const overlay = document.getElementById('modal-overlay');
        const modal = overlay.querySelector('.modal-tech');
        modal.querySelector('h3').innerText = title;
        modal.querySelector('p').innerText = message;

        if (isDanger) {
            modal.classList.add('danger-mode');
        } else {
            modal.classList.remove('danger-mode');
        }

        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');

        overlay.style.display = 'flex';

        const close = () => {
            overlay.style.display = 'none';
            modal.classList.remove('danger-mode');
        };

        confirmBtn.onclick = () => { close(); callback(); };
        cancelBtn.onclick = () => { close(); };
    },

    // 算术验证码
    initCaptcha: (containerId) => {
        const container = document.getElementById(containerId);
        const a = Math.floor(Math.random() * 10);
        const b = Math.floor(Math.random() * 10);
        container.dataset.result = a + b;
        container.innerText = `${a} + ${b} = ?`;
    },

    checkCaptcha: (containerId, value) => {
        const container = document.getElementById(containerId);
        return parseInt(value) === parseInt(container.dataset.result);
    }
};

// 页面加载完成后隐藏加载器
window.addEventListener('load', () => {
    setTimeout(UI.hideLoader, 500);
});
