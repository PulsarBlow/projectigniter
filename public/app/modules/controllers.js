!function () {
    "use strict";

    angular.module("app.controllers", ["firebase.utils"])

        .controller("SigninController", ["$log", "$scope", "$location", "simpleLogin", "userLoginInfo",
            function ($log, $scope, $location, simpleLogin, userLoginInfo) {

                $log.debug("SigninController instantiated", {userLoginInfo: userLoginInfo});

                if(angular.isObject(userLoginInfo) && userLoginInfo.uid) {

                    $log.debug("SigninController:authCheck", {
                        userLoginInfo: userLoginInfo,
                        uid: userLoginInfo.uid
                    });

                    $location.replace();
                    $location.path("/");
                }

                $scope.signin = function (provider) {
                    simpleLogin.login(provider);
                };
            }])

        // userLoginInfo is resolved by the state resolver (route.js)
        .controller("AppController", ["$log", "$scope", "simpleLogin", "dataSync", "userLoginInfo", "userData",
            function ($log, $scope, simpleLogin, dataSync, userLoginInfo, userData) {

            $log.debug("AppController instantiated", {dataSync: dataSync, userLoginInfo: userLoginInfo});

            userData.tryCreateUser(userLoginInfo);
            userData.tryCreateUserProfile(userLoginInfo);

            var syncUser = userData.syncUser(userLoginInfo.uid);
            syncUser.$bindTo($scope, "user");

            var syncUserProfile = userData.syncUserProfile(userLoginInfo.uid);
            syncUserProfile.$bindTo($scope, "userProfile");

            $scope.signout = function() {
                simpleLogin.logout();
            };
        }])

        .controller("HomeController", ["$log", "$scope", function ($log, $scope) {
            $log.debug("HomeController instantiated");
        }])

        .controller("VoteController", ["$log", "$scope", "$state", "names", "userVote", "userFavorites",
            function ($log, $scope, $state, names, userVote, userFavorites) {

            $log.debug("VoteController instantiated");

            $scope.userVote = userVote;

            $scope.getPoints = function (index) {
                return Math.pow(2, userFavorites.maxItems - index);
            };
            $scope.hasVote = function() {
              return $scope.userVote !== null && $scope.userVote.length > 0;
            };
        }])

        .controller("VoteSelectionController", ["$log", "$scope", "names", "userFavorites",
            function($log, $scope, names, userFavorites){

            $log.debug("VoteSelectionController instantiated");

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

        .controller("VoteSortingController", ["$log", "$scope", "$location", "userFavorites",
            function($log, $scope, $location, userFavorites){

            $log.debug("VoteSortingController instantiated", {scope: $scope});

            if(!userFavorites || !userFavorites.isFull()) {
                $location.replace();
                $location.path("/vote/create/about");
                return;
            }

            $scope.favorites = userFavorites;
            $scope.sortableOptions = {
                opacity: 0.5,
                axis: "y"
            };
        }])

        .controller("VoteCastController", ["$log", "$scope", "$location", "$state", "votes", "userFavorites", "notifier",
            function($log, $scope, $location, $state, votes, userFavorites, notifier){

            $log.debug("VoteCastController instantiated");

            if(!userFavorites || !userFavorites.isFull()) {
                $location.replace();
                $location.path("/vote/create/about");
                return;
            }

            $scope.favorites = userFavorites;
            $scope.vote = function () {
                var voteSet = [];

                userFavorites.forEach(function (name, index) {
                    voteSet.push(({value: name.value, id: name.id, points: $scope.getPoints(index) }));
                });

                votes.saveVote($scope.user.id, voteSet).then(function(){
                    userFavorites.$clear();
                    notifier.success("<strong>Vote enregistré!</strong><br />Merci de votre participation.")
                    $state.go("app.results");
                }, function() {
                    notifier.error("Echec de l'enregistrement du vote. Veuillez réessayer.");
                });
            };
        }])

        .controller("VoteEditController", ["$log", "$location", "$scope", "$state", "notifier", "votes", "userVote", function($log, $location, $scope, $state, notifier, votes, userVote) {
            $log.debug("VoteEditController instantiated", {
                userVote: userVote
            })

            if(!userVote || userVote.length === 0) {
                $location.replace();
                $location.path("/vote/create/about");
                return;
            }

            $scope.deleteVote = function() {
                votes.deleteVote($scope.user.id);
                notifier.success("<strong>Vote supprimé!</strong><br />Vous pouvez revoter.")
                $state.go("app.vote.create.step1");
            }
        }])

        .controller("ResultsController", ["$log", "$scope", function ($log, $scope) {
            $log.debug("ResultsController instantiated");
        }])

    ;

    function errMessage(err) {
        return angular.isObject(err) && err.code ? err.code : err + "";
    }
}();