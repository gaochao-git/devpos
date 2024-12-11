import {Button, Form, Icon, Input, message} from "antd";
import React, {Component, } from "react";
import MyAxios from "../common/interface"

// 登陆
class Login extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            login_type:"cloud"
        }
    }
    // 点击Login提交
    handleLoginSubmit = e => {
        e.preventDefault();
        this.props.form.validateFields((err, values) => {
            console.log('Received values of form: ', values);
            this.login(values["username"],values["password"]);
        });
    };
    // 登陆验证
    async login(username, password) {
        MyAxios.post('/login/v1/auth_web/', {username, password}).then(function(res){
            if (res.data.token){
                window.localStorage.setItem('token', res.data.token)
                window.location.reload()
            }else {
                message.error("未获取到token")
            }

        }).catch(function (error) {
            message.error("登陆失败")
            console.log(error)
        })
    }

    render() {
        const { form } = this.props;
        const { getFieldDecorator } = form;
        return (
            <div>
                <Form onSubmit={this.handleLoginSubmit} className="login-form">
                    <Form.Item>
                        {getFieldDecorator('username', {
                            rules: [{ required: true, message: 'Please input your username!' }],
                        })(
                            <Input prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Username"/>,
                        )}
                    </Form.Item>
                    <Form.Item>
                        {getFieldDecorator('password', {rules: [{ required: true, message: 'Please input your Password!' }],})
                            (<Input prefix={<Icon type="lock" style={{ color: 'rgba(0,0,0,.25)' }} />} type="password" placeholder="Password"/>,)
                        }
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" className="login-form-button"> Log in </Button>
                    </Form.Item>
                </Form>
                <Button type={this.state.login_type==="cloud"?"primary":"dashed"} style={{marginLeft:10}} onClick={()=>{this.setState({login_type:"cloud"})}}> Cloud Log in</Button>
                <Button type={this.state.login_type==="sso"?"primary":"dashed"} style={{marginLeft:10}} onClick={()=>{this.setState({login_type:"sso"})}}> SSO Log in </Button>
                <Button type={this.state.login_type==="ldap"?"primary":"dashed"} style={{marginLeft:10}} onClick={()=>{this.setState({login_type:"ldap"})}}> LDAP Log in </Button>
            </div>
        )
    }
}
export default Form.create()(Login);