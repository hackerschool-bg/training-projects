import React from 'react';
import { render } from 'react-dom';

class AdminPage extends React.Component {
  render () {
    return <p>test</p>;
  }
}

render(
  <AdminPage />,
  document.getElementById('content')
);
