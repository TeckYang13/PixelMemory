function handleSubmit(event) {
    event.preventDefault();
    
    // 这里添加发送表单数据到后端的逻辑
    // 示例中只显示成功消息
    const successMessage = document.getElementById('successMessage');
    successMessage.style.display = 'block';
    
    // 清空表单
    event.target.reset();
    
    // 3秒后隐藏成功消息
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
}