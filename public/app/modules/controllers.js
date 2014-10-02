!function () {
    "use strict";

    angular.module("app.controllers", ["firebase.utils"])

        .controller("SigninController", ["$log", "$scope", "$state", "simpleLogin",
            function ($log, $scope, $state, simpleLogin) {

                $log.debug("SigninController instantiated");

                $scope.signin = function (provider) {
                    simpleLogin.login(provider)
                        .then(function (user) {
                            $log.debug("User signed in", user);
                            $state.go("app.home");
                        }, function (err) {
                            $log.error("Unable to login", err);
                        });
                };
            }])

        // currentUser is resolved by the state resolver (route.js)
        .controller("AppController", ["$log", "$scope", "$rootScope", "simpleLogin", "userLoginInfo", "userData",
            function ($log, $scope, $rootScope, simpleLogin, userLoginInfo, userData) {

            $log.debug("AppController instantiated", {userLoginInfo: userLoginInfo});

            userData.tryCreateUser(userLoginInfo);
            userData.tryCreateUserProfile(userLoginInfo);

            var syncUser = userData.syncUser(userLoginInfo.uid);
            syncUser.$bindTo($scope, "user");

            var syncUserProfile = userData.syncUserProfile(userLoginInfo.uid);
            syncUserProfile.$bindTo($scope, "userProfile");

            $scope.main = {
                brand: "Project Igniter",
                err: null
            };

            $scope.signout = function() {
                $scope.main.err = null;
                simpleLogin.logout();
            };

        }])


        .controller("HomeController", ["$log", "$scope", function ($log, $scope) {
            $log.debug("HomeController instantiated");
        }])

        .controller("VoteController", ["$log", "$scope", "$state", "names", "user", "userFavorites",
            function ($log, $scope, $state, names, user, userFavorites) {

            $log.debug("VoteController instantiated", {scope: $scope, names: names, user: user, userFavorites: userFavorites});

            // if has vote go to vote edit, otherwise go to vote.create
            $state.go("app.vote.create.step0");
            $scope.favorites = userFavorites;
            $scope.getPoints = function (index) {
                return Math.pow(2, userFavorites.maxItems - index);
            };

            $log.debug("user", user);
        }])

        .controller("VoteSelectionController", ["$log", "$scope", "names", "user", "userFavorites",
            function($log, $scope, names, user, userFavorites){

            $log.debug("VoteSelectionController instantiated", {scope: $scope, names: names, user: user, userFavorites: userFavorites});

            $scope.names = names;
            $scope.maxItems = userFavorites.maxItems;
            $scope.toggleFavorite = function (model) {
                if (!model) {
                    return;
                }
                if (userFavorites.length >= userFavorites.maxItems) {
                    userFavorites.$remove(model);
                } else {
                    userFavorites.$toggle(model);
                }
            };
            $scope.isStepCompleted = function() {
              return userFavorites.isFull();
            };
        }])

        .controller("VoteSortingController", ["$log", "$scope", "userFavorites",
            function($log, $scope, userFavorites){

            $log.debug("VoteSortingController instantiated", {scope: $scope, userFavorites: userFavorites});

            $scope.sortableOptions = {
                opacity: 0.5,
                axis: "y"
            };
        }])

        .controller("VoteCastController", ["$log", "$scope", "$state", "votes", "user", "userFavorites", "notifier",
            function($log, $scope, $state, votes, user, userFavorites, notifier){

            $log.debug("VoteCastController instantiated");

            $scope.vote = function () {
                var voteSet = [];

                userFavorites.forEach(function (name, index) {
                    voteSet.push(({value: name.value, id: name.id, points: $scope.getPoints(index) }));
                });

                votes.saveVote(user.id, voteSet).then(function(){
                    user.saveVote(voteSet).then(function() {
                        userFavorites.$clear();
                        notifier.success("Vote enregistré! Merci de votre participation.")
                        $state.go("results");

                    }, function(){
                        notifier.error("Echec de l'enregistrement du vote. Veuillez réessayer.");
                    });
                }, function() {
                    notifier.error("Echec de l'enregistrement du vote. Veuillez réessayer.");
                });
            };
        }])

        .controller("ResultsController", ["$log", "$scope", function ($log, $scope) {
            $log.debug("ResultsController instantiated");
        }])

    ;

    function errMessage(err) {
        return angular.isObject(err) && err.code ? err.code : err + "";
    }
}();