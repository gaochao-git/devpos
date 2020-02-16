import {Button, Form, Icon, Input, message} from "antd";
import React, {Component, } from "react";
import axios from "axios";
import store from "./store";
import {setToken} from "./index";
const server = 'http://192.168.0.104:8000';

function InvalidCredentialsException(message) {
    this.message = message;
    this.name = 'InvalidCredentialsException';
}

class Login extends Component  {
    constructor(props) {
        super(props);
    }
    handleLoginSubmit = e => {
        e.preventDefault();
        this.props.form.validateFields((err, values) => {
            console.log('Received values of form: ', values);
            //this.handleLoginSubmit(values)
            this.login(values["username"],values["password"]);
        });
    };
    // async login(username, password) {
    //     return axios.post(`${server}/auth/`, {username, password}).then(function (response) {
    //         store.dispatch(setToken(response.data.token));
    //         window.localStorage.setItem('token', response.data.token)
    //         window.location.reload()
    //     }).catch(function (error) {
    //         if (_.get(error, 'response.status') === 400) {
    //             throw new InvalidCredentialsException(error);
    //         }
    //         throw error;
    //     });
    // }

    async login(username, password) {
        axios.post(`${server}/auth/`, {username, password}).then(function(res){
            console.log(res)
            store.dispatch(setToken(res.data.token));
            window.localStorage.setItem('token', res.data.token)
            window.location.reload()
        }).catch(function (error) {
            message.error("登陆失败")
            console.log(error)
        })

       // if (res.data.status==="ok" && res.data.message==="验证成功"){
       //     store.dispatch(setToken(res.data.token));
       //     window.localStorage.setItem('token', res.data.token)
       //     window.location.reload()
       // }else if (res.data.status==="ok" && res.data.message==="验证失败"){
       //     message.error("验证失败")
       // }else if (res.data.status==="error"){
       //     message.error(res.data.message)
       // }
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