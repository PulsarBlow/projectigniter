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

        // dataSync & userLoginInfo are resolved by the state resolver (route.js)
        .controller("AppController", ["$log", "$rootScope", "$scope", "simpleLogin", "dataSync", "userLoginInfo", "userData",
            function ($log, $rootScope, $scope, simpleLogin, dataSync, userLoginInfo, userData) {

            $log.debug("AppController instantiated", {dataSync: dataSync, userLoginInfo: userLoginInfo});

            dataSync.app.$bindTo($rootScope, "app");
            dataSync.user.$bindTo($rootScope, "user");
            dataSync.userProfile.$bindTo($rootScope, "userProfile");
            dataSync.userConfig.$bindTo($rootScope, "userConfig");

            // Bind to nav toggle event
            $rootScope.$on("nav:stateChanged", function(event, args) {
                dataSync.userConfig.navCollapsed = args.collapsed;
                dataSync.userConfig.$save();
            });

            $scope.signout = function() {
                simpleLogin.logout();
            };
        }])

        .controller("HomeController", ["$log", "$scope", "activityService", "ACTIVITY_LIMIT", function ($log, $scope, activityService, ACTIVITY_LIMIT) {
            $log.debug("HomeController instantiated");

            var limit = ACTIVITY_LIMIT;
            $scope.activities = activityService.sync(limit);
            $scope.limit = limit;
            $scope.getMoment = function(value) {
                return moment(value).fromNow();
            };
            $scope.like = function(id) {
                activityService.like(id, $scope.user, $scope.userProfile);
            };
            $scope.isMyActivity = function(activityId) {
                return activityId === $scope.user.id;
            }
            $scope.hasLiked = function(activityLikers) {
              if(!activityLikers) { return false; }
              return $scope.user.id in activityLikers;
            };
        }])

        .controller("VoteController", ["$log", "$scope", "$state", "names", "userVote", "userFavorites",
            function ($log, $scope, $state, names, userVote, userFavorites) {

            $log.debug("VoteController instantiated", {userVote: userVote});

            $scope.userVote = userVote;

            $scope.getPoints = function (index) {
                return Math.pow(2, userFavorites.maxItems - index);
            };
            $scope.hasVote = function() {
              return $scope.userVote && $scope.userVote.voteItems;
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

                votes.saveVote($scope.user, $scope.userProfile, voteSet).then(function(){
                    userFavorites.$clear();
                    notifier.success("<strong>Vote enregistré!</strong><br />Merci de votre participation.");
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

            if(!userVote || !userVote.voteItems) {
                $location.replace();
                $location.path("/vote/create/about");
                return;
            }

            $scope.deleteVote = function() {
                votes.deleteVote($scope.user, $scope.userProfile);
                notifier.success("<strong>Vote supprimé!</strong><br />Vous pouvez revoter.")
                $state.go("app.vote.create.step1");
            }

            $scope.getMoment = function() {
                return moment(userVote.date).fromNow();
            }
        }])

        .controller("ResultsController", ["$log", "$scope", "votes", "notifier", "userData", "appCounters", function ($log, $scope, votes, notifier, userData, appCounters) {
            $log.debug("ResultsController instantiated");

            var syncVotes = votes.syncVotes(), totalPoints = 0, shouldNotify = false;

            $scope.chartData = [];
            syncVotes.$watch(function(){
                $scope.voteResult = buildVoteResult(syncVotes);
            });
            $scope.getPercent = function(points) {
                if($scope.voteResult.totalPoints === 0) { return 0;}
                return Math.round(points * 100 / $scope.voteResult.totalPoints);
            };

            $scope.optinFeedback = function() {
                if($scope.userConfig.emailOnVoteEnd) {
                    notifier.success("Vous recevrez l'email récapitulatif du résultat du vote.", "Inscription enregistrée");
                } else {
                    notifier.info("Vous ne recevrez pas d'email.", "Désinscription enregistrée");
                }
            }

            appCounters.sync.$bindTo($scope, "appCounters");

            function buildVoteResult(votes) {

                if(!angular.isArray(votes) || !votes.length) {
                    return {
                        data: [],
                        voters: [],
                        totalPoints: 0
                    };
                }

                var allVotesMap = {},
                    allVotes = [],
                    allVotersMap = {},
                    allVoters = [],
                    totalPoints = 0;

                votes.forEach(function(item, index) {
                    if(!angular.isObject(item) || !angular.isObject(item.voteItems))  { return; }

                    var voteItems = item.voteItems,
                        currentVoter = item.userInfo;

                    for (var key in voteItems) {
                        allVotesMap[voteItems[key].id] = allVotesMap[voteItems[key].id] || { id: voteItems[key].id, value: voteItems[key].value, points: 0, num: 0, voters: []};
                        allVotesMap[voteItems[key].id].points += voteItems[key].points;
                        allVotesMap[voteItems[key].id].num += 1;
                        totalPoints += voteItems[key].points;
                        allVotesMap[voteItems[key].id].voters.push({
                            displayName: currentVoter.displayName,
                            pageUrl: currentVoter.pageUrl,
                            pictureUrl: currentVoter.pictureUrl,
                            points: voteItems[key].points
                        });
                    }

                    if(!(currentVoter.displayName in allVotersMap)) {
                        allVotersMap[currentVoter.displayName] = currentVoter;
                    }
                });
                $log.debug("buildVoteResult:nameMap", allVotesMap);
                for (var key in allVotesMap) {
                    allVotes.push(allVotesMap[key]);
                }
                // sort by points descending then by total number of voters
                allVotes.sort(function(item1, item2){
                    var result = item2.points - item1.points;
                    if(result != 0) { return result; }
                    return item2.voters.length - item1.voters.length;
                });

                $log.debug("buildVoteResult:voterMap", allVotersMap);
                for(var key in allVotersMap){
                    allVoters.push(allVotersMap[key]);
                }
                var result = {
                    allVotes: allVotes,
                    allVoters: allVoters,
                    totalPoints: totalPoints
                };
                $log.debug("buildVoteResult:result", result);
                return result;
            }
        }])

    ;

    function errMessage(err) {
        return angular.isObject(err) && err.code ? err.code : err + "";
    }
}();