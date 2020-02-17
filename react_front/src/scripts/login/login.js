import {Button, Form, Icon, Input, message} from "antd";
import React, {Component, } from "react";
import axios from "axios";
import store from "./store";
import {setToken} from "./index";
import {backendServerApiRoot} from "../common/util";
//const server = 'http://192.168.0.104:8000';

// 登陆
class Login extends Component  {
    constructor(props) {
        super(props);
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
        axios.post(`${backendServerApiRoot}/auth/`, {username, password}).then(function(res){
            console.log(res)
            window.localStorage.setItem('token', res.data.token)
            window.location.reload()
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
                            <Input
                                prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />}
                                placeholder="Username"
                            />,
                        )}
                    </Form.Item>
                    <Form.Item>
                        {getFieldDecorator('password', {
                            rules: [{ required: true, message: 'Please input your Password!' }],
                        })(
                            <Input
                                prefix={<Icon type="lock" style={{ color: 'rgba(0,0,0,.25)' }} />}
                                type="password"
                                placeholder="Password"
                            />,
                        )}
                    </Form.Item>
                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            className="login-form-button"
                        >
                            Log in
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        )
    }
}
export default Form.create()(Login);