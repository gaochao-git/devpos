handleSend = async () => {
    const { inputValue } = this.state;
    if (!inputValue?.trim()) return;

    const newMessage = {
        role: 'user',
        content: inputValue
    };

    this.setState(prevState => ({
        messages: [...prevState.messages, newMessage],
        inputValue: '',  // 发送后立即清空输入框
        streaming: true
    }));

    try {
        await this.sendMessage(inputValue);
    } catch (error) {
        console.error('Error sending message:', error);
        message.error('发送消息失败');
    } finally {
        this.setState({ streaming: false });
    }
}; 