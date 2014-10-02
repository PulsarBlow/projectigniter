!function () {
    "use strict";

    angular.module("app.controllers", ["firebase.utils"])

        .controller("AppController", ["$log", "$scope", "$rootScope", "$state", "user2", "userProfile",
            function ($log, $scope, $rootScope, $state, user2, userProfile) {

            $log.debug("AppController instantiated", {$state: $state});
            $scope.user = {};
            $scope.userProfile = {};

            $rootScope.$on("nav:stateChanged", function(event, args) {
                $log.debug("nav:stateChanged", {args: args, user: user});
                //user.config.isNavOpened = args.navState && args.navState === "expanded" ? true : false;
                //user.$save();
            });

            $rootScope.$on("$firebaseSimpleLogin:login", function(event, args){
                $log.debug("$firebaseSimpleLogin:login", {event: event, args: args});

                var userId = args.uid,
                    syncUser = user2(userId),
                    syncUserProfile = userProfile(userId);

                syncUser.tryCreateUser(userId, syncUser.parseUser(args))
                    .then(function() {
                       syncUserProfile.tryCreateUserProfile(userId, syncUserProfile.parseUserProfile(args)).then(function() {

                       }, function(err) {
                           $log.error("Unable to try to create userProfile", err);
                       });
                    }, function(err) {
                        $log.error("Unable to try to create user", err);
                    });

//                syncUser.$bindTo($scope, "user").then(function() {
//                    $log.debug("user bound to scope");
//                });
//                syncUserProfile.$bindTo($scope, "userProfile").then(function() {
//                   $log.debug("userProfile bound to scope");
//                });

            });
            $scope.main = {
                brand: "Project Igniter",
                err: null
            };
//            simpleLogin.watch(function(user){
//                $log.debug("user status changed", {user: user});
//            }, $scope);

        }])

        .controller("HeaderController", ["$log", "$scope", "user", "simpleLogin",
            function ($log, $scope, user, simpleLogin) {

            $log.debug("HeaderController instantiated");
            $scope.signout = function() {
                $scope.main.err = null;
                simpleLogin.logout();
            };
        }])


        .controller("NavController", ["$log", "$scope", "user", function ($log, $scope, user) {
            $log.debug("NavController instantiated");
        }])

        .controller("HomeController", ["$log", "$scope", function ($log, $scope) {
            $log.debug("HomeController instantiated");
        }])

        .controller("SigninController", ["$log", "$scope", "$state", "simpleLogin",
            function ($log, $scope, $state, simpleLogin) {

            $log.debug("SigninController instantiated");

            $scope.signin = function (provider) {
                $scope.main.err = null;
                simpleLogin.login(provider)
                    .then(function (user) {
                        $log.debug("User signed in", user);
                        $state.go("home");
                    }, function (err) {
                        $scope.main.err = errMessage(err);
                    });
            };
        }])

        .controller("VoteController", ["$log", "$scope", "$state", "names", "user", "userFavorites",
            function ($log, $scope, $state, names, user, userFavorites) {

            $log.debug("VoteController instantiated", {scope: $scope, names: names, user: user, userFavorites: userFavorites});

            // if has vote go to vote edit, otherwise go to vote.create
            $state.go("vote.create.step0");
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