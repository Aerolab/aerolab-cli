class EndpointsHelper {
  constructor(rootApiEndpoint) {
    this.API_PROJET_CREATE = `${rootApiEndpoint}/create`;
    this.API_GROUP_CREATE = `${rootApiEndpoint}/createGroup`;
    this.API_PROJECT_CHECK_GROUP = `${rootApiEndpoint}/check`;
    this.API_USERS_LIST = `${rootApiEndpoint}/users`;
    this.API_USERS_ADD = `${rootApiEndpoint}/users/add`;
  }

  static appendUrlParamsToUrl(url, aeroToken){
    return `${url}?aero_token=${aeroToken}`;
  }
}

module.exports = EndpointsHelper;
