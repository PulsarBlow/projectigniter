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

                // Abstract state to resolve user before triggering state transition
                .state("app", {
                    abstract: true,
                    template: "<ui-view />",
                    resolve: {
                        requireUser: "requireUser",
                        currentUser: function(requireUser) {
                            return requireUser();
                        }
                    },
                    controller : function($scope, currentUser) {
                        $scope.currentUser = currentUser;
                    }
                })

                .state("app.home", {
                    url: "/",
                    templateUrl: "app/views/index.html",
                    authRequired: true
                })

                .state ("concept", {
                    url: "/concept",
                    templateUrl: "app/views/pages/concept.html",
                    authRequired: true
                })

                .state("vote", {
                    url: "/vote",
                    templateUrl: "app/views/pages/vote.html",
                    authRequired: true
                })

                .state("vote.create", {
                    url: "/create",
                    templateUrl: "app/views/pages/vote/create.html",
                    authRequired: true
                })

                .state("vote.create.step0", {
                    url: "/about",
                    templateUrl: "app/views/pages/vote/create.step0.html",
                    authRequired: true
                })

                .state("vote.create.step1", {
                    url: "/select",
                    templateUrl: "app/views/pages/vote/create.step1.html",
                    authRequired: true
                })

                .state("vote.create.step2", {
                    url: "/points",
                    templateUrl: "app/views/pages/vote/create.step2.html",
                    authRequired: true
                })

                .state("vote.create.step3", {
                    url: "/submit",
                    templateUrl: "app/views/pages/vote/create.step3.html",
                    authRequired: true
                })

                .state("vote.edit", {
                    url: "/edit",
                    templateUrl: "app/views/pages/vote/edit.html",
                    authRequired: true
                })

                .state("results", {
                    url: "/results",
                    templateUrl: "app/views/pages/results.html",
                    authRequired: true
                })

                .state("signin", {
                    url: "/signin",
                    templateUrl: "app/views/signin.html"
                })

                .state("account", {
                    url: "/account",
                    templateUrl: "app/views/pages/account.html",
                    authRequired: true
                })

                .state("404", {
                    url: "/404",
                    templateUrl: "app/views/404.html"
                })

        }])
        ;
}(angular = window.angular || {});