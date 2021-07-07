import React from 'react';
import { render } from 'react-dom';
import config from '../config/config.json';

class LoginPage extends React.Component {
  // constructor (props) {
  //   super(props);

  //   this.state = {
  //     username: '',
  //     password: ''
  //   };

  //   this.handleInputChange = this.handleInputChange.bind(this);
  // }

  // handleInputChange (event) {
  //   this.setState({
  //     [event.target.name]: event.target.value
  //   });
  // }

  render () {
    return <div>
      <form action={`${config.url}/auth/login`} method='POST'>
        <label>
          Username:
          <input
            name='username'
            type='text' />
        </label>
        <label>
          Password:
          <input
            name='password'
            type='password' />
        </label>
        <input type='submit' value='Log in' />
      </form>
    </div>;
  }
}

render(
  <LoginPage />,
  document.getElementById('content')
);
