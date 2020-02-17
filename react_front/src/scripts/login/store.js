// import { compose, createStore, applyMiddleware } from 'redux';
// import { createLogger } from 'redux-logger';
// import { persistStore, } from 'redux-persist';
// import { combineReducers } from 'redux';
// import * as actionType from './types';
//
//
// const tokenInitialState = null;
// const token = (state = tokenInitialState, action) => {
//     switch(action.type) {
//         case actionType.SET_TOKEN:
//             return action.data;
//         default:
//             return state;
//     }
// }
//
// const appReducer = combineReducers({
//     token,
// })
//
// const rootReducer = (state, action) => {
//     return appReducer(state, action);
// }
//
// const store = createStore(
//     rootReducer,
//     compose(
//         applyMiddleware(
//             createLogger(),
//         ),
//         //autoRehydrate()
//     ));persistStore(store);
// export default store;