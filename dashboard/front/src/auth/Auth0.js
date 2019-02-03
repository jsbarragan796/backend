/* eslint-disable no-undef */
/* eslint-disable class-methods-use-this */
/* eslint no-restricted-globals:0 */
import auth0 from 'auth0-js';

export default class Auth0 {
  userProfile;

  auth0 = new auth0.WebAuth({
    domain: 'sudsbogota.auth0.com',
    clientID: 'UXJMlMN3G7u47GuS1uxjobeQR4i-RbH0',
    redirectUri: 'http://192.168.0.3:3000/callback',
    responseType: 'token id_token',
    scope: 'openid profile'
  });

  constructor() {
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.handleAuthentication = this.handleAuthentication.bind(this);
    this.isAuthenticated = this.isAuthenticated.bind(this);
    this.getProfile = this.getProfile.bind(this);
  }

  getProfile() {
    if (this.userProfile) {
      return this.userProfile;
    }
    return this.auth0.client.userInfo(localStorage.getItem('access_token'), (err, profile) => {
      if (profile) {
        this.userProfile = profile;
        return this.userProfile;
      }
      return {};
    });
  }

  login() {
    this.auth0.authorize();
  }

  handleAuthentication() {
    this.auth0.parseHash((err, authResult) => {
      if (authResult && authResult.accessToken && authResult.idToken) {
        this.setSession(authResult);
        location.pathname = '/';
      } else if (err) {
        location.pathname = '/';
      }
    });
  }

  setSession(authResult) {
    // Set the time that the Access Token will expire at
    const expiresAt = JSON.stringify(authResult.expiresIn * 100 + new Date().getTime());
    localStorage.setItem('access_token', authResult.accessToken);
    localStorage.setItem('id_token', authResult.idToken);
    localStorage.setItem('expires_at', expiresAt);
    // navigate to the home route
    location.hash = '';
    location.pathname = '/';
  }

  logout() {
    // Clear Access Token and ID Token from local storage
    this.userProfile = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('expires_at');
    localStorage.clear();
    // navigate to the home route
    location.pathname = '/inicio';
  }

  isAuthenticated() {
    // Check whether the current time is past the
    // Access Token's expiry time
    const expiresAt = JSON.parse(localStorage.getItem('expires_at'));
    return new Date().getTime() < expiresAt;
  }
}
