// 背景动画逻辑
const canvas = document.getElementById('bg-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let lines = [];

function initCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    lines = [];
    for (let i = 0; i < 50; i++) {
        lines.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            opacity: Math.random()
        });
    }
}

function animate() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;

    lines.forEach((l, i) => {
        l.x += l.vx;
        l.y += l.vy;
        if (l.x < 0 || l.x > canvas.width) l.vx *= -1;
        if (l.y < 0 || l.y > canvas.height) l.vy *= -1;

        // 绘制连接线
        lines.forEach((l2, j) => {
            if (i === j) return;
            const dist = Math.hypot(l.x - l2.x, l.y - l2.y);
            if (dist < 150) {
                ctx.strokeStyle = `rgba(0, 210, 255, ${(1 - dist / 150) * 0.15})`;
                ctx.beginPath();
                ctx.moveTo(l.x, l.y);
                ctx.lineTo(l2.x, l2.y);
                ctx.stroke();
            }
        });
    });
    requestAnimationFrame(animate);
}

if (canvas) {
    window.addEventListener('resize', initCanvas);
    initCanvas();
    animate();
}

// 初始化验证码
if (document.getElementById('captcha-display')) {
    UI.initCaptcha('captcha-display');
}
