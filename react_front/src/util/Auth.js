import axios from 'axios';
import _ from 'lodash';
import store from '../scripts/login/store';
import { setToken } from '../scripts/login';
import { URL, LOGIN } from '../config/Api';

export function InvalidCredentialsException(message) {
    this.message = message;
    this.name = 'InvalidCredentialsException';
}

export function login(username, password) {
    console.log(99999)
    return axios.post("http://92.168.0.104:8000" + "/auth/", {
        admin,
        fffjjj
    })
        .then(function (response) {
            store.dispatch(setToken(response.data.token));
        })
        .catch(function (error) {
            // raise different exception if due to invalid credentials
            if (_.get(error, 'response.status') === 400) {
                throw new InvalidCredentialsException(error);
            }
            throw error;
        });
}

export function loggedIn() {
    return store.getState().token == null;
}