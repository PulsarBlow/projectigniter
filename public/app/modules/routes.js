!function(angular) {
    "use strict";

    angular.module("app.routes", ["ngRoute", "ui.router", "simpleLogin"])

        .config(["$locationProvider", function ($locationProvider) {
            $locationProvider.html5Mode(true);
        }])

        //State router
        .config(["$stateProvider", "$urlRouterProvider", function($stateProvider, $urlRouterProvider) {

            $urlRouterProvider.when("", "/");
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
                    authRequired: false
                })

                .state("404", {
                    url: "/404",
                    templateUrl: "app/views/404.html",
                    authRequired: false
                })

                // Abstract state to resolve user before triggering state transition
                .state("app", {
                    abstract: true,
                    //authRequired: true, // This doesn't work. This property is not inherited by child states. Have to set it everywhere ...
                    url:"",
                    templateUrl: "app/views/index.html",
                    controller : "AppController",
                    resolve: {
                        requireUser: "requireUser",
                        userLoginInfo: function(requireUser) {
                            return requireUser();
                        }
                    }
                })

                .state("app.home", {
                    authRequired: true,
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
        ;
}(angular = window.angular || {});