!function(angular) {
    "use strict";

    angular.module("app.routes", ["ngRoute", "ui.router", "simpleLogin"])

        .config(["$locationProvider", function ($locationProvider) {
            $locationProvider.html5Mode(true);
        }])

        //State router
        .config(["$stateProvider", "$urlRouterProvider", function($stateProvider, $urlRouterProvider) {

            $urlRouterProvider.when("", "/");
            $urlRouterProvider.when("/vote", "/vote/edit");
            $urlRouterProvider.otherwise("/404");
            // Insensitive case handling
            $urlRouterProvider.rule(function ($injector, $location) {
                var path = $location.path(), normalized = path.toLowerCase();
                if (path != normalized) {
                    $location.replace().path(normalized);
                }
            });

            $stateProvider

                .state("signin", {
                    url: "/signin",
                    templateUrl: "app/views/signin.html",
                    controller: "SigninController",
                    authRequired: false,
                    resolve: {
                        userLoginInfo: function($log, $q, simpleLogin) {
                            return simpleLogin.getUser();
                        }
                    }
                })

                .state("404", {
                    url: "/404",
                    templateUrl: "app/views/404.html",
                    authRequired: false
                })

                // Abstract state to resolve user before triggering state transition
                .state("app", {
                    abstract: true,
                    authRequired: true, // This doesn't work. This property is not inherited by child states. Have to set it everywhere ...
                    url:"",
                    data: {
                      authRequired: true
                    },
                    templateUrl: "app/views/index.html",
                    controller : "AppController",
                    resolve: {
                        userLoginInfo: function(requireUser) {
                            return requireUser();
                        },
                        dataSync: function($q, simpleLogin, userData) {
                            var dfd = $q.defer(),
                                promises = [],
                                syncUser,
                                syncUserProfile,
                                syncUserVote ;

                            simpleLogin.getUser().then(function(userLoginInfo) {
                                if(!angular.isObject(userLoginInfo) || !userLoginInfo.uid) {
                                    dfd.reject();
                                    return;
                                }
                                syncUser = userData.syncUser(userLoginInfo.uid);
                                syncUserProfile = userData.syncUserProfile(userLoginInfo.uid);
                                syncUserVote = userData.syncUserVote(userLoginInfo.uid);
                                $q.all([
                                    userData.tryCreateUser(userLoginInfo),
                                    userData.tryCreateUserProfile(userLoginInfo),
                                    syncUser.$loaded(),
                                    syncUserProfile.$loaded(),
                                    syncUserVote.$loaded()
                                ]).then(function() {
                                    dfd.resolve({
                                        user: syncUser,
                                        userProfile: syncUserProfile,
                                        userVote: syncUserVote
                                    });
                                })
                            })
                            return dfd.promise;
                        }
                    }
                })

                .state("app.home", {
                    //authRequired: true,
                    url: "/",
                    templateUrl: "app/views/pages/home.html",
                    controller: "HomeController"
                })

                .state ("app.concept", {
                    authRequired: true,
                    url: "/concept",
                    templateUrl: "app/views/pages/concept.html"
                })

                .state("app.vote", {
                    authRequired: true,
                    url: "/vote",
                    templateUrl: "app/views/pages/vote.html",
                    controller: "VoteController",
                    resolve: {
                        votes: "votes",
                        userVote: function(userLoginInfo, votes) {
                            return votes.syncUserVote(userLoginInfo.uid).$loaded();
                        }
                    }
                })

                .state("app.vote.create", {
                    authRequired: true,
                    url: "/create",
                    templateUrl: "app/views/pages/vote/create.html"
                })

                .state("app.vote.create.step0", {
                    authRequired: true,
                    url: "/about",
                    templateUrl: "app/views/pages/vote/create.step0.html"
                })

                .state("app.vote.create.step1", {
                    authRequired: true,
                    url: "/select",
                    templateUrl: "app/views/pages/vote/create.step1.html",
                    controller: "VoteSelectionController"
                })

                .state("app.vote.create.step2", {
                    authRequired: true,
                    url: "/points",
                    templateUrl: "app/views/pages/vote/create.step2.html",
                    controller: "VoteSortingController"
                })

                .state("app.vote.create.step3", {
                    authRequired: true,
                    url: "/cast",
                    templateUrl: "app/views/pages/vote/create.step3.html",
                    controller: "VoteCastController"
                })

                .state("app.vote.edit", {
                    authRequired: true,
                    url: "/edit",
                    templateUrl: "app/views/pages/vote/edit.html",
                    controller: "VoteEditController"
                })

                .state("app.results", {
                    authRequired: true,
                    url: "/results",
                    templateUrl: "app/views/pages/results.html"
                })

                .state("app.account", {
                    authRequired: true,
                    url: "/account",
                    templateUrl: "app/views/pages/account.html"
                })

        }])

        .run(["$log", "$location", "$rootScope", "$state", "simpleLogin", "loginRedirectPath", function($log, $location, $rootScope, $state, simpleLogin, loginRedirectPath) {

            $log.debug("app.routes:run", {
                rootScope: $rootScope, state: $state, loginRedirectPath: loginRedirectPath
            });

            $rootScope.isAuthenticated = false;
            $rootScope.returnUrl = "/";

//            simpleLogin.watch(function(user){
//
//                $log.debug("simpleLogin:watch", {
//                    user: user,
//                    isAuthenticated:$rootScope.isAuthenticated,
//                    currentState:$state.current,
//                    currentStateUrl: $state.current.url,
//                    currentStateAuthRequired: isAuthRequired($state.current)
//                });
//
//                $rootScope.isAuthenticated = (angular.isObject(user) && user.uid) ? true : false;
//
//                $log.debug("simpleLogin:watch:isAuthenticated", {
//                    user: user,
//                    isAuthenticated:$rootScope.isAuthenticated
//                });
//
//                if(!user && isAuthRequired($state.current)){
//
//                    $log.debug("simpleLogin:watch:redirecting", {
//                        user: user,
//                        currentState: $state.current
//                    });
//
//                    $location.path(loginRedirectPath);
//                }
//            }, $rootScope);

            $rootScope.$on("$firebaseSimpleLogin:login", function(event, userLoginInfo) {
                $rootScope.isAuthenticated = (angular.isObject(userLoginInfo) && userLoginInfo.uid) ? true : false;
                $log.debug("$firebaseSimpleLogin:login", {
                    userLoginInfo: userLoginInfo,
                    isAuthenticated:$rootScope.isAuthenticated,
                    currentState:$state.current,
                    currentStateUrl: $state.current.url,
                    currentStateAuthRequired: isAuthRequired($state.current)
                });

                if($location.path() === loginRedirectPath) {
                    redirectTo("/");
                }
            });

            $rootScope.$on("$firebaseSimpleLogin:logout", function(event) {

                $log.debug("$firebaseSimpleLogin:logout", {
                    currentState:$state.current,
                    currentStateUrl: $state.current.url,
                    currentStateAuthRequired: isAuthRequired($state.current)
                });

                $rootScope.isAuthenticated = false;
                redirectTo(loginRedirectPath);
            });

            $rootScope.$on("$firebaseSimpleLogin:error", function(event, error) {

                $log.debug("$firebaseSimpleLogin:error", {
                    currentState:$state.current,
                    currentStateUrl: $state.current.url,
                    currentStateAuthRequired: isAuthRequired($state.current)
                });

                $rootScope.isAuthenticated = false;
                redirectTo(loginRedirectPath);
            });

            $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams) {

                $log.debug("routes:$stateChangeStart", {
                    fromState: fromState,
                    fromStateUrl: fromState.url,
                    toState: toState,
                    toStateUrl: toState.url,
                    isAuthenticated: $rootScope.isAuthenticated,
                    isAuthRequired: isAuthRequired(toState)
                });

                // state requires auth but user not authed
                if(isAuthRequired(toState) && !$rootScope.isAuthenticated) {

                    $log.debug("routes:$stateChangeStart - Need authentication", {
                        isAuthenticated: $rootScope.isAuthenticated,
                        authRequired: isAuthRequired(toState)
                    });

                    //event.preventDefault();
                    redirectTo(loginRedirectPath);
                }
            });

            function isAuthRequired(state) {
                return state && state.data && state.data.authRequired;
            }
            function redirectTo(path) {

                $log.debug("routes:redirect to %s", path);

                $location.replace();
                $location.path(path);
            }
        }])

        ;
}(angular = window.angular || {});