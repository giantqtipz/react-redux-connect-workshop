import {createStore} from "Redux";

export const getNotes = (notes) => {
    return {
        type: GET_NOTES,
        notes: notes
    }
}

const reducer = (state = [], action) => {
    switch(action.type){
        case GET_NOTES:
            return {
                ...state,
                notes: action.notes
            }
        default:
            return state;
    }
}

const store = createStore(reducer);

export default store;