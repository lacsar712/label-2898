function login(event) {
    event.preventDefault();

    const form = event.target;
    const username = form.username.value;
    const password = form.password.value;
    const captchaVal = form.captcha.value;
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    if (!UI.checkCaptcha('captcha-display', captchaVal)) {
        UI.toast('验证码错误', 'error');
        UI.initCaptcha('captcha-display');
        return;
    }

    UI.showLoader();

    fetch('/login/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ username, password })
    })
        .then(response => response.json())
        .then(data => {
            UI.hideLoader();
            if (data.success) {
                UI.toast('登录成功，正在进入系统...');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                UI.toast(data.message || '登录失败', 'error');
                UI.initCaptcha('captcha-display');
            }
        })
        .catch(error => {
            UI.hideLoader();
            UI.toast('网络连接异常', 'error');
            console.error('Error:', error);
        });
}

function handleLogout() {
    UI.confirm('系统登出', '确定要退出兵团库房管理系统吗？', () => {
        window.location.href = '/logout/';
    });
}
