const API = '/api';

//simulation of logged in user
const fetchUser = async ()=> {
  const storage = window.localStorage;
  const userId = storage.getItem('userId'); 
  if(userId){
    try {
      return (await axios.get(`${API}/users/detail/${userId}`)).data;
    }
    catch(ex){
      storage.removeItem('userId');
      return fetchUser();
    }
  }
  const user = (await axios.get(`${API}/users/random`)).data;
  storage.setItem('userId', user.id);
  return  user;
};

import React from 'react';
import ReactDOM from 'react-dom';
import thunks from 'redux-thunk';
import { HashRouter, Link, Route } from 'react-router-dom';
import { Provider, connect } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';

import axios from 'axios';

//constants
const SET_AUTH = 'SET_AUTH';
const SET_NOTES = 'SET_NOTES';
const CREATE_NOTE = 'CREATE_NOTE';

//action creators
const setAuth = (auth)=> ({ type: SET_AUTH, auth });
const setNotes = (notes)=> ({ type: SET_NOTES, notes });
const createNote = (note)=> ({ type: CREATE_NOTE, note });

//thunks
const getAuth = ()=> {
  return async(dispatch)=> {
    const auth = await fetchUser();
    await dispatch(setAuth(auth));
    return dispatch(getNotes());
  };
};

const getNotes = ()=> {
  return async(dispatch, getState)=> {
    const notes = (await axios.get(`${API}/users/${getState().auth.id}/notes`)).data;
    return dispatch(setNotes(notes));
  };
};

//store
const store = createStore(
  combineReducers({
    auth: (state = {}, action)=> {
      if(action.type === SET_AUTH){
        return action.auth;
      }
      return state;
    },
    notes: (state = [], action)=> {
      if(action.type === SET_NOTES){
        return action.notes;
      }
      return state;
    },
    newNote: (state = '', action) => {
      if(action.type === CREATE_NOTE){
        return action.note;
      } else {
        return state
      }
    }
  }), applyMiddleware(thunks)
);


const { render } = ReactDOM;
const { Component } = React;

const _Nav = ({ auth, notes })=> {
  return (
    <div>
      <nav>
        <Link to='/notes'>Notes ({ notes.length })</Link>
        <Link to='/notes'>Create</Link>
      </nav>
      <h1>Welcome { auth.fullName }</h1>
    </div>
  );
};

const Nav = connect(
  ({ auth, notes })=> {
    return {
      auth,
      notes
    };
  }
)(_Nav);

const _Notes = ({ auth, notes })=> {
  return (
    <ul>
      {notes.map(note => <li key={note.id}>{note.text}</li>)}
    </ul>
  );
};

const Notes = connect(
  ({ auth, notes })=> {
    return {
      auth,
      notes
    };
  }
)(_Notes);

const handleChange = (event) => {
  store.dispatch({
    type: CREATE_NOTE,
    note: event.target.value
  })
}

const handleSubmit = (event, auth, note) => {
  event.preventDefault();

  dispatch(() => {
    axios.post(`/api/users/${auth.id}/notes`, {userId: auth.id, text: note.text, archived: false})
    .then(response => console.log(response));
  })

}

const _Create = ({ auth, notes })=> {
  return (
    <form onSubmit={(e) => handleSubmit(e, auth, note)}>
      <input value={} onChange={handleChange}/>
      <button>Create Note!</button>
    </form>
  );
};

const Create = connect(
  ({ auth, notes })=> {
    return {
      auth,
      notes
    };
  }
)(_Create);

// const mapStateToProps = (state) => {
//   return {
//     auth: state.auth,
//     notes: state.notes
//   }
// }

class _App extends Component{ 
  componentDidMount(){
    this.props.fetchUser()
  }

  render(){
    return (
        <HashRouter>
          <Route component={ Nav } />
          <Route component={ Notes } />          
        </HashRouter>
    );
  }
}

const App = connect(({ auth })=> {
  return {
    auth
  };
}, (dispatch)=> {
  return {
    fetchUser: ()=> dispatch(getAuth())
  };
})(_App);

const root = document.querySelector('#root');
render(<Provider store={ store }><App /></Provider>, root);
