(function(angular) {
    'use strict';

    angular.module('app.routes', ['ngRoute', 'ui.router', 'simpleLogin'])

        .config(['$locationProvider', function ($locationProvider) {
            $locationProvider.html5Mode(true).hashPrefix('!');
        }])

        //State router
        .config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

            $urlRouterProvider.when('', '/');
            $urlRouterProvider.otherwise('/404');

            // Insensitive case handling
            $urlRouterProvider.rule(function ($injector, $location) {
                var path = $location.path(), normalized = path.toLowerCase();
                if (path !== normalized) {
                    $location.replace().path(normalized);
                }
            });

            $stateProvider

                .state('signin', {
                    url: '/signin',
                    templateUrl: 'views/signin.html',
                    controller: 'SigninController',
                    resolve: {
                        userLoginInfo: function($log, $q, $rootScope, simpleLogin) {
                            return simpleLogin.getUser();
                        }
                    }
                })

                .state('404', {
                    url: '/404',
                    templateUrl: 'views/404.html'
                })

                // Abstract state to resolve user before triggering state transition
                .state('app', {
                    abstract: true,
                    url:'',
                    data: {
                      authRequired: true
                    },
                    templateUrl: 'views/index.html',
                    controller : 'AppController',
                    resolve: {
                        dataSync: function($q, simpleLogin, userData) {
                            var dfd = $q.defer(),
                                syncUser,
                                syncUserProfile,
                                syncUserConfig;

                            simpleLogin.getUser().then(function(userLoginInfo) {
                                if(!angular.isObject(userLoginInfo) || !userLoginInfo.uid) {
                                    dfd.reject();
                                    return;
                                }
                                syncUser = userData.syncUser(userLoginInfo.uid);
                                syncUserProfile = userData.syncUserProfile(userLoginInfo.uid);
                                syncUserConfig = userData.syncUserConfig(userLoginInfo.uid);
                                $q.all([
                                    userData.tryCreateUser(userLoginInfo),
                                    userData.tryCreateUserProfile(userLoginInfo),
                                    userData.tryCreateUserConfig(userLoginInfo),
                                    syncUser.$loaded(),
                                    syncUserProfile.$loaded()
                                ]).then(function() {
                                    dfd.resolve({
                                        user: syncUser,
                                        userProfile: syncUserProfile,
                                        userConfig: syncUserConfig
                                    });
                                });
                            });

                            return dfd.promise;
                        }
                    }
                })

                .state('app.home', {
                    url: '/',
                    templateUrl: 'views/pages/home.html',
                    controller: 'HomeController'
                })

                .state ('app.concept', {
                    url: '/concept',
                    templateUrl: 'views/pages/concept.html'
                })

                .state('app.votes', {
                    url: '/votes',
                    templateUrl: 'views/pages/votes.html',
                    controller: 'VotesController'
                })

                .state('app.vote', {
                    url: '/vote/:id',
                    templateUrl: 'views/pages/vote.html',
                    controller: 'VoteController',
                    resolve: {
                        vote: function($q, $location, $stateParams, voteService) {
                            var dfd = $q.defer();
                            voteService.sync.vote($stateParams.id).$loaded(function(vote){
                               if(!vote.id) {
                                   $location.replace();
                                   $location.path('/404');
                                   dfd.reject();
                               } else {
                                   dfd.resolve(vote);
                               }
                            });

                            return dfd.promise;
                        },
                        userVote: function($q, $stateParams, voteService, dataSync) {
                            var dfd = $q.defer();
                            voteService.sync.userVote(dataSync.user.id, $stateParams.id).$loaded(function(userVote){
                                dfd.resolve(userVote);
                            });
                            return dfd.promise;
                        }
                    }
                });

        }])

        .run(['$log', '$location', '$rootScope', '$state', 'simpleLogin', 'activityService', 'userData', 'loginRedirectPath', function($log, $location, $rootScope, $state, simpleLogin, activityService, userData, loginRedirectPath) {

            var isAuthenticated = false, homeUrl = '/', returnUrl = null, lastUserLoginInfo;

            $log.debug('app.routes:run', {
                rootScope: $rootScope,
                state: $state,
                loginRedirectPath: loginRedirectPath
            });

            $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState) {

                $log.debug('routes:$stateChangeStart', {
                    fromState: fromState,
                    fromStateUrl: fromState.url,
                    toState: toState,
                    toStateUrl: toState.url,
                    isAuthenticated: isAuthenticated,
                    isAuthRequired: isAuthRequired(toState)
                });

                // state requires auth but user not authed
                if(isAuthRequired(toState) && !isAuthenticated) {

                    $log.debug('routes:$stateChangeStart - Need authentication', {
                        isAuthenticated: isAuthenticated,
                        authRequired: isAuthRequired(toState)
                    });

                    //event.preventDefault();
                    redirectTo(loginRedirectPath);
                }
            });

            $rootScope.$on('$firebaseSimpleLogin:login', function(event, userLoginInfo) {

                isAuthenticated = (angular.isObject(userLoginInfo) && userLoginInfo.uid) ? true : false;

                $log.debug('$firebaseSimpleLogin:login', {
                    userLoginInfo: userLoginInfo,
                    isAuthenticated: isAuthenticated,
                    currentState:$state.current,
                    currentStateUrl: $state.current.url,
                    currentStateAuthRequired: isAuthRequired($state.current)
                });

//                if(isAuthenticated) {
//                    lastUserLoginInfo = userData.parseUserLoginInfo(userLoginInfo);
//                    activityService.publish('usersignedin', lastUserLoginInfo.user, lastUserLoginInfo.userProfile);
//                }

                if(returnUrl) {
                    redirectTo(returnUrl);
                    returnUrl = null;
                } else if ($location.path() === loginRedirectPath) {
                    redirectTo(homeUrl);
                }
            });

            $rootScope.$on('$firebaseSimpleLogin:logout', function(/*event*/) {

                $log.debug('$firebaseSimpleLogin:logout', {
                    currentState:$state.current,
                    currentStateUrl: $state.current.url,
                    currentStateAuthRequired: isAuthRequired($state.current)
                });

//                activityService.publish('usersignedout', lastUserLoginInfo.user, lastUserLoginInfo.userProfile);
                isAuthenticated = false;
                lastUserLoginInfo = null;
                redirectTo(loginRedirectPath);
            });

            $rootScope.$on('$firebaseSimpleLogin:error', function(/*event, error*/) {

                $log.debug('$firebaseSimpleLogin:error', {
                    currentState:$state.current,
                    currentStateUrl: $state.current.url,
                    currentStateAuthRequired: isAuthRequired($state.current)
                });

                isAuthenticated = false;
                redirectTo(loginRedirectPath);
            });

            function isAuthRequired(state) {
                return state && state.data && state.data.authRequired ? true : false;
            }

            function redirectTo(path) {

                $log.debug('routes:redirect to %s', path);

                $location.replace();
                $location.path(path);
            }
        }])

        ;
})(window.angular || {});