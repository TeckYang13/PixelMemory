document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const answer = question.nextElementSibling;
        const isActive = question.classList.contains('active');
        
        // 关闭所有其他答案
        document.querySelectorAll('.faq-question').forEach(q => {
            q.classList.remove('active');
            q.nextElementSibling.classList.remove('active');
        });

        // 如果当前问题未激活，则打开它
        if (!isActive) {
            question.classList.add('active');
            answer.classList.add('active');
        }
    });
});