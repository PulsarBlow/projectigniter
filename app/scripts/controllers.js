(function (angular) {
    'use strict';

    angular.module('app.controllers', ['firebase.utils'])

        .controller('SigninController', ['$log', '$scope', '$location', 'simpleLogin', 'userLoginInfo',
            function ($log, $scope, $location, simpleLogin, userLoginInfo) {

                $log.debug('SigninController instantiated', {userLoginInfo: userLoginInfo});

                $scope.signin = function (provider) {
                    simpleLogin.login(provider);
                };
            }])

        // dataSync & userLoginInfo are resolved by the state resolver (route.js)
        .controller('AppController', ['$log', '$rootScope', '$scope', 'simpleLogin', 'dataSync',
            function ($log, $rootScope, $scope, simpleLogin, dataSync) {

            $log.debug('AppController instantiated', {dataSync: dataSync });

            dataSync.user.$bindTo($rootScope, 'user');
            dataSync.userProfile.$bindTo($rootScope, 'userProfile');
            dataSync.userConfig.$bindTo($rootScope, 'userConfig');

            // Bind to nav toggle event
            $rootScope.$on('nav:stateChanged', function(event, args) {
                dataSync.userConfig.navCollapsed = args.collapsed;
                dataSync.userConfig.$save();
            });

            $scope.signout = function() {
                simpleLogin.logout();
            };
        }])

        .controller('HomeController', ['$log', '$scope', 'activityService', 'voteService', 'ACTIVITY_LIMIT', function ($log, $scope, activityService, voteService, ACTIVITY_LIMIT) {
            $log.debug('HomeController instantiated');

            var limit = ACTIVITY_LIMIT;
            $scope.activities = activityService.sync(limit);
            $scope.limit = limit;
            $scope.votes = voteService.sync.votes;

            $scope.getMoment = function(value) {
                return moment(value).fromNow();
            };

            $scope.like = function(id) {
                activityService.like(id, $scope.user, $scope.userProfile);
            };

            $scope.isMyActivity = function(activityId) {
                return activityId === $scope.user.id;
            };

            $scope.hasLiked = function(activityLikers) {
              if(!activityLikers) { return false; }
              return $scope.user.id in activityLikers;
            };
        }])

        .controller('VotesController', ['$log', '$scope', '$state', 'voteService', function ($log, $scope, $state, voteService) {

            $log.debug('VotesController instantiated');

            $scope.votes = voteService.sync.votes;

            $scope.getStatus = function(vote) {
                var status = { value: 'locked', label:'A venir' };
                if(!angular.isObject(vote)) {
                    return status;
                }
                if(vote.isLocked) {

                }
                else if(isOpened(vote)) {
                    status.value = 'opened';
                    status.label = 'En cours';
                }
                else {
                    status.value = 'closed';
                    status.label = 'Terminé';
                }
                return status;
            };

            $scope.viewDetails = function(vote) {
              if(!vote || !vote.id) {
                  $log.warn('Cancelling viewDetails', {vote: vote});
                  return;
              }
                $state.go('app.vote', {id: vote.id});
            };

            function isOpened(vote) {
                var now = moment(),
                    start = vote.dateStart ? moment(vote.dateStart) : moment(0),
                    end = vote.dateEnd ? moment(vote.dateEnd) : moment('2020-01-01');
                return now.isAfter(start, 'min') && now.isBefore(end, 'min');
            }

        }])

        .controller('VoteController', ['$log', '$rootScope', '$scope', '$state', '$stateParams', 'voteService', 'counterService', 'notifier', 'userVote', function ($log, $rootScope, $scope, $state, $stateParams, voteService, counterService, notifier, userVote) {

            $log.debug('VoteController instantiated', {stateParams: $stateParams});

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

                votes.forEach(function(item) {
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
                $log.debug('buildVoteResult:nameMap', allVotesMap);
                var key;
                for (key in allVotesMap) {
                    allVotes.push(allVotesMap[key]);
                }
                // sort by points descending then by total number of voters
                allVotes.sort(function(item1, item2){
                    var result = item2.points - item1.points;
                    if(result !== 0) { return result; }
                    return item2.voters.length - item1.voters.length;
                });

                $log.debug('buildVoteResult:voterMap', allVotersMap);
                for(key in allVotersMap){
                    allVoters.push(allVotersMap[key]);
                }
                var result = {
                    allVotes: allVotes,
                    allVoters: allVoters,
                    totalPoints: totalPoints
                };
                $log.debug('buildVoteResult:result', result);
                return result;
            }

            var syncVote = voteService.sync.vote($stateParams.id),
                syncVoteResult = voteService.sync.voteResult($stateParams.id),
                selection = voteService.createSelection($stateParams.id),
                syncVoteCounters = counterService.voteCounters($stateParams.id);

            syncVoteCounters.$bindTo($scope, 'voteCounters');
            syncVote.$bindTo($scope, 'vote');
            syncVote.$watch(function() {
                $log.debug('syncVote:watch', {syncVote: syncVote, scopeVote: $scope.vote});
                selection.changeLimit(syncVote.options.maxItems);
            }, this);
            syncVoteResult.$watch(function(){
                $scope.voteResult = buildVoteResult(syncVoteResult);
            });

            // userVote is resolved in route.js
            $scope.userVote = userVote;

            $scope.getPercent = function(points) {
                if($scope.voteResult.totalPoints === 0) { return 0;}
                return Math.round(points * 100 / $scope.voteResult.totalPoints);
            };

            $scope.selection = selection;

            $scope.toggleSelection = function(item) {
                if (!item) {
                    return;
                }
                if (selection.isFull()) {
                    selection.remove(item);
                } else {
                    selection.addOrRemove(item);
                }
            };

            $scope.showTimer = function(vote) {
                if(!vote || !vote.dateEnd) {
                    return false;
                }
                return moment().isBefore(moment(vote.dateEnd));
            };

            $scope.optinFeedback = function() {
                if($scope.userConfig.emailOnVoteEnd) {
                    notifier.success('Vous recevrez le résultat final du vote par email', 'Inscription enregistrée');
                } else {
                    notifier.info('Vous ne recevrez pas d\'email.', 'Désinscription enregistrée');
                }
            };

            $scope.sortableOptions = {
                opacity: 0.5,
                axis: 'y'
            };

            $scope.tabs = [
                {title: 'Résultat du vote', view: 'views/pages/vote/_results.html'},
                {title: 'Mon vote', view: 'views/pages/vote/_myvote.html'}
            ];

            $scope.getPoints = function (index) {
                return Math.pow(2, selection.limit - index);
            };
            $scope.getMoment = function(date) {
                return moment(date).fromNow();
            };

            $scope.saveVote = function () {
                var voteSet = [];

                selection.forEach(function (name, index) {
                    voteSet.push(({value: name.value, id: name.id, points: $scope.getPoints(index) }));
                });

                voteService.saveUserVote(selection.voteId, voteSet, $scope.user, $scope.userProfile).then(function(){
                    selection.clear();
                    notifier.success('Merci de votre participation', 'Vote enregistré!');
                    //$scope.tabs[0].active = true;
                }, function() {
                    notifier.error('L\'enregistrement du vote a échoué. Veuillez réessayer.', 'Erreur');
                });
            };

            $scope.deleteVote = function() {
                voteService.removeUserVote($stateParams.id, $scope.user, $scope.userProfile).then(function(){
                    notifier.info('Vous pouvez revoter.', 'Vote supprimé');
                }, function() {
                    notifier.error('La suppression du vote a échoué. Veuillez réessayer.', 'Erreur');
                });
            };

        }])

    ;
    
})(window.angular || {});