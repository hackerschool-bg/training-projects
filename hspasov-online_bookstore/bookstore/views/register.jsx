import React from 'react';
import { render } from 'react-dom';
import config from '../config/config.json';

function RegisterPage () {
  return <div>
    <form action={`${config.url}/auth/register`} method='POST'>
      <label>
        Username:
        <input
          name='username'
          type='text' />
      </label>
      <br />
      <label>
        Email:
        <input
          name='email'
          type='text' />
      </label>
      <br />
      <label>
        First name:
        <input
          name='firstName'
          type='text' />
      </label>
      <br />
      <label>
        Last name:
        <input
          name='lastName'
          type='text' />
      </label>
      <br />
      <label>
        Password:
        <input
          name='password'
          type='password' />
      </label>
      <br />
      <label>
        Country:
        <input
          name='country'
          type='text' />
      </label>
      <br />
      <label>
        Address:
        <input
          name='address'
          type='text' />
      </label>
      <br />
      <label>
        Phone number:
        <input
          name='phoneNumber'
          type='text' />
      </label>
      <br />
      <label>
        Currency:
        <input
          name='currency'
          type='text' />
      </label>
      <br />
      <label>
        Date of birth:
        <input
          name='dateOfBirth'
          type='text' />
      </label>
      <br />
      <input type='submit' value='Register' />
    </form>
  </div>;
}

render(
  <RegisterPage />,
  document.getElementById('content')
);
