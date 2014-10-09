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
                    resolve: {
                        userLoginInfo: function($log, $q, $rootScope, simpleLogin) {
                            return simpleLogin.getUser();
                        }
                    }
                })

                .state("404", {
                    url: "/404",
                    templateUrl: "app/views/404.html"
                })

                // Abstract state to resolve user before triggering state transition
                .state("app", {
                    abstract: true,
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
                        dataSync: function($q, simpleLogin, appData, userData) {
                            var dfd = $q.defer(),
                                promises = [],
                                syncApp,
                                syncUser,
                                syncUserProfile,
                                syncUserVote,
                                syncUserConfig;

                            simpleLogin.getUser().then(function(userLoginInfo) {
                                if(!angular.isObject(userLoginInfo) || !userLoginInfo.uid) {
                                    dfd.reject();
                                    return;
                                }
                                syncApp = appData;
                                syncUser = userData.syncUser(userLoginInfo.uid);
                                syncUserProfile = userData.syncUserProfile(userLoginInfo.uid);
                                syncUserVote = userData.syncUserVote(userLoginInfo.uid);
                                syncUserConfig = userData.syncUserConfig(userLoginInfo.uid);
                                $q.all([
                                    syncApp.$loaded(),
                                    userData.tryCreateUser(userLoginInfo),
                                    userData.tryCreateUserProfile(userLoginInfo),
                                    userData.tryCreateUserConfig(userLoginInfo),
                                    syncUser.$loaded(),
                                    syncUserProfile.$loaded(),
                                    syncUserVote.$loaded()
                                ]).then(function() {
                                    dfd.resolve({
                                        app: syncApp,
                                        user: syncUser,
                                        userProfile: syncUserProfile,
                                        userVote: syncUserVote,
                                        userConfig: syncUserConfig
                                    });
                                })
                            });

                            return dfd.promise;
                        }
                    }
                })

                .state("app.home", {
                    url: "/",
                    templateUrl: "app/views/pages/home.html",
                    controller: "HomeController"
                })

                .state ("app.concept", {
                    url: "/concept",
                    templateUrl: "app/views/pages/concept.html"
                })

                .state("app.vote", {
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

                .state("app.votes", {
                    url: "/votes",
                    templateUrl: "app/views/pages/votes.html",
                    controller: "VotesController",
                    resolve: {
                        votes: "votes",
                        userVote: function(userLoginInfo, votes) {
                            return votes.syncUserVote(userLoginInfo.uid).$loaded();
                        }
                    }
                })

                .state("app.vote.create", {
                    url: "/create",
                    templateUrl: "app/views/pages/vote/create.html"
                })

                .state("app.vote.create.step0", {
                    url: "/about",
                    templateUrl: "app/views/pages/vote/create.step0.html"
                })

                .state("app.vote.create.step1", {
                    url: "/select",
                    templateUrl: "app/views/pages/vote/create.step1.html",
                    controller: "VoteSelectionController"
                })

                .state("app.vote.create.step2", {
                    url: "/points",
                    templateUrl: "app/views/pages/vote/create.step2.html",
                    controller: "VoteSortingController"
                })

                .state("app.vote.create.step3", {
                    url: "/cast",
                    templateUrl: "app/views/pages/vote/create.step3.html",
                    controller: "VoteCastController"
                })

                .state("app.vote.edit", {
                    url: "/edit",
                    templateUrl: "app/views/pages/vote/edit.html",
                    controller: "VoteEditController"
                })

                .state("app.results", {
                    url: "/results",
                    templateUrl: "app/views/pages/results.html",
                    controller: "ResultsController"
                })

                .state("app.account", {
                    url: "/account",
                    templateUrl: "app/views/pages/account.html"
                })

        }])

        .run(["$log", "$location", "$rootScope", "$state", "simpleLogin", "activityService", "userData", "loginRedirectPath", function($log, $location, $rootScope, $state, simpleLogin, activityService, userData, loginRedirectPath) {

            var isAuthenticated = false, homeUrl = "/votes", returnUrl = null, lastUserLoginInfo;

            $log.debug("app.routes:run", {
                rootScope: $rootScope,
                state: $state,
                loginRedirectPath: loginRedirectPath
            });

            $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams) {

                $log.debug("routes:$stateChangeStart", {
                    fromState: fromState,
                    fromStateUrl: fromState.url,
                    toState: toState,
                    toStateUrl: toState.url,
                    isAuthenticated: isAuthenticated,
                    isAuthRequired: isAuthRequired(toState)
                });

                // state requires auth but user not authed
                if(isAuthRequired(toState) && !isAuthenticated) {

                    $log.debug("routes:$stateChangeStart - Need authentication", {
                        isAuthenticated: isAuthenticated,
                        authRequired: isAuthRequired(toState)
                    });

                    //event.preventDefault();
                    redirectTo(loginRedirectPath);
                }
            });

            $rootScope.$on("$firebaseSimpleLogin:login", function(event, userLoginInfo) {

                isAuthenticated = (angular.isObject(userLoginInfo) && userLoginInfo.uid) ? true : false;

                $log.debug("$firebaseSimpleLogin:login", {
                    userLoginInfo: userLoginInfo,
                    isAuthenticated: isAuthenticated,
                    currentState:$state.current,
                    currentStateUrl: $state.current.url,
                    currentStateAuthRequired: isAuthRequired($state.current)
                });

//                if(isAuthenticated) {
//                    lastUserLoginInfo = userData.parseUserLoginInfo(userLoginInfo);
//                    activityService.publish("usersignedin", lastUserLoginInfo.user, lastUserLoginInfo.userProfile);
//                }

                if(returnUrl) {
                    redirectTo(returnUrl);
                    returnUrl = null;
                } else if ($location.path() === loginRedirectPath) {
                    redirectTo(homeUrl);
                }
            });

            $rootScope.$on("$firebaseSimpleLogin:logout", function(event) {

                $log.debug("$firebaseSimpleLogin:logout", {
                    currentState:$state.current,
                    currentStateUrl: $state.current.url,
                    currentStateAuthRequired: isAuthRequired($state.current)
                });

//                activityService.publish("usersignedout", lastUserLoginInfo.user, lastUserLoginInfo.userProfile);
                isAuthenticated = false;
                lastUserLoginInfo = null;
                redirectTo(loginRedirectPath);
            });

            $rootScope.$on("$firebaseSimpleLogin:error", function(event, error) {

                $log.debug("$firebaseSimpleLogin:error", {
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

                $log.debug("routes:redirect to %s", path);

                $location.replace();
                $location.path(path);
            }
        }])

        ;
}(angular = window.angular || {});