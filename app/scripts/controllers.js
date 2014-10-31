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

                $log.debug('AppController instantiated', {dataSync: dataSync});

                dataSync.user.$bindTo($rootScope, 'user');
                dataSync.userProfile.$bindTo($rootScope, 'userProfile');
                dataSync.userConfig.$bindTo($rootScope, 'userConfig');

                // Bind to nav toggle event
                $rootScope.$on('nav:stateChanged', function (event, args) {
                    dataSync.userConfig.navCollapsed = args.collapsed;
                    dataSync.userConfig.$save();
                });

                $scope.signout = function () {
                    simpleLogin.logout();
                };
            }])

        .controller('HomeController', ['$log', '$scope', '$state', 'activityService', 'voteService', 'ACTIVITY_LIMIT', function ($log, $scope, $state, activityService, voteService, ACTIVITY_LIMIT) {
            $log.debug('HomeController instantiated');

            var limit = ACTIVITY_LIMIT;
            $scope.activities = activityService.sync(limit);
            $scope.limit = limit;
            $scope.votes = voteService.sync.votes;

            $scope.getMoment = function (value, from, hideSuffix) {
                var fromMoment = from ? moment(from) : moment();
                return moment(value).from(fromMoment, hideSuffix);
            };
            $scope.getVoteProgress = function (vote) {
                return voteService.getVoteProgress(vote);
            };

            $scope.like = function (id) {
                activityService.like(id, $scope.user, $scope.userProfile);
            };

            $scope.isMyActivity = function (activityId) {
                return activityId === $scope.user.id;
            };

            $scope.hasLiked = function (activityLikers) {
                if (!activityLikers) {
                    return false;
                }
                return $scope.user.id in activityLikers;
            };

            $scope.goTo = function (state) {
                if (!state) {
                    return;
                }
                $state.go(state);
            };
        }])

        .controller('VotesController', ['$log', '$scope', '$state', 'voteService', function ($log, $scope, $state, voteService) {

            $log.debug('VotesController instantiated');

            $scope.votes = voteService.sync.votes;

            $scope.getStatus = function (vote) {
                var status = {value: 'locked', label: 'A venir'};
                if (!angular.isObject(vote)) {
                    return status;
                }
                if (vote.isLocked) {

                }
                else if (isOpened(vote)) {
                    status.value = 'opened';
                    status.label = 'En cours';
                }
                else {
                    status.value = 'closed';
                    status.label = 'Terminé';
                }
                return status;
            };

            $scope.viewDetails = function (vote) {
                if (!vote || !vote.id) {
                    $log.warn('Cancelling viewDetails', {vote: vote});
                    return;
                }
                $state.go('app.vote.default', {id: vote.id});
            };

            function isOpened(vote) {
                var now = moment(),
                    start = vote.dateStart ? moment(vote.dateStart) : moment(0),
                    end = vote.dateEnd ? moment(vote.dateEnd) : moment('2020-01-01');
                return now.isAfter(start, 'min') && now.isBefore(end, 'min');
            }

        }])

        .controller('VoteController', ['$log', '$rootScope', '$scope', '$state', '$stateParams', 'voteService', 'counterService', 'notifier', function ($log, $rootScope, $scope, $state, $stateParams, voteService, counterService, notifier) {

            $log.debug('VoteController instantiated', {stateParams: $stateParams});

            var syncVote = voteService.sync.vote($stateParams.id),
                syncVoteResult = voteService.sync.voteResult($stateParams.id),
                selection = voteService.createSelection($stateParams.id),
                syncVoteCounters = counterService.voteCounters($stateParams.id);

            syncVoteCounters.$bindTo($scope, 'voteCounters');
            syncVote.$bindTo($scope, 'vote');

            $scope.voteId = $stateParams.id;

            $scope.voteSummary = voteService.sync.voteSummary($stateParams.id);

            $scope.getPercent = function (points) {
                if ($scope.voteResult.totalPoints === 0) {
                    return 0;
                }
                return Math.round(points * 100 / $scope.voteResult.totalPoints);
            };

            $scope.shouldShowTimer = function (vote) {
                if (!vote || !vote.dateEnd) {
                    return false;
                }
                return moment().isBefore(moment(vote.dateEnd));
            };

            $scope.optinFeedback = function () {
                if ($scope.userConfig.emailOnVoteEnd) {
                    notifier.success('Vous recevrez le résultat final du vote par email', 'Inscription enregistrée');
                } else {
                    notifier.info('Vous ne recevrez pas d\'email.', 'Désinscription enregistrée');
                }
            };

            $scope.getMoment = function (date) {
                return moment(date).fromNow();
            };

        }])

        .controller('VoteEditController', ['$log', '$rootScope', '$scope', '$state', '$stateParams', 'voteService', 'counterService', 'notifier', 'userVote', function ($log, $rootScope, $scope, $state, $stateParams, voteService, counterService, notifier, userVote) {
            $log.debug('VoteEditController instantiated');

            var syncVote = voteService.sync.vote($stateParams.id),
                selection = voteService.createSelection($stateParams.id);

            syncVote.$bindTo($scope, 'vote');
            syncVote.$watch(function () {
                $log.debug('syncVote:watch', {syncVote: syncVote, scopeVote: $scope.vote});
                selection.changeLimit(syncVote.options.maxItems);
            }, this);
            // userVote is resolved in route.js
            $scope.userVote = userVote;
            $scope.selection = selection;

            $scope.sortableOptions = {
                opacity: 0.5,
                axis: 'y'
            };

            $scope.getPoints = function (index) {
                return Math.pow(2, selection.limit - index);
            };

            $scope.toggleSelection = function (item) {
                if (!item) {
                    return;
                }
                if (selection.isFull()) {
                    selection.remove(item);
                } else {
                    selection.addOrRemove(item);
                }
            };

            $scope.saveVote = function () {
                var voteSet = [];

                selection.forEach(function (name, index) {
                    voteSet.push(({value: name.value, id: name.id, points: $scope.getPoints(index)}));
                });

                voteService.saveUserVote(selection.voteId, voteSet, $scope.user, $scope.userProfile).then(function () {
                    selection.clear();
                    notifier.success('Merci de votre participation', 'Vote enregistré!');
                    //$scope.tabs[0].active = true;
                }, function () {
                    notifier.error('L\'enregistrement du vote a échoué. Veuillez réessayer.', 'Erreur');
                });
            };

            $scope.deleteVote = function () {
                voteService.removeUserVote($stateParams.id, $scope.user, $scope.userProfile).then(function () {
                    notifier.info('Vous pouvez revoter.', 'Vote supprimé');
                }, function () {
                    notifier.error('La suppression du vote a échoué. Veuillez réessayer.', 'Erreur');
                });
            };
        }])

        .controller('VoteImproveController', ['$log', '$state', '$stateParams', '$scope', 'nameCheckService', 'notifier', function ($log, $state, $stateParams, $scope, nameCheckService, notifier) {

            $log.debug('VoteImproveController instantiated', {stateParams: $stateParams});

            $scope.nameChecks = {
                all: [], valid: [], notValid: []
            };
            $scope.checkInProgress = false;

            $scope.validate = function (newName) {
                $log.debug('VoteImproveController:validate name:%s', newName);
                $scope.checkInProgress = true;
                nameCheckService.check(newName).then(function (nameCheck) {
                    $log.debug('VoteImproveController:validate result', nameCheck);
                    $scope.nameChecks.all.push(nameCheck);
                    if (nameCheck.isValid()) {
                        $scope.nameChecks.valid.push(nameCheck);
                    } else {
                        $scope.nameChecks.notValid.push(nameCheck);
                    }
                    $scope.newName = null;
                }, function (args) {
                    $log.debug('VoteImproveController:validate failed', args);
                }).finally(function () {
                    $scope.checkInProgress = false;
                });
            };

            $scope.submit = function () {
                $log.debug('VoteImproveController:submit', $scope.nameChecks.valid);
                notifier.success('Après revue positive nous les incluerons au vote.', 'Propositions envoyées');
                $state.go('app.vote.default')
            };

            $scope.reset = function () {
                $scope.nameChecks.all = [];
                $scope.nameChecks.valid = [];
                $scope.nameChecks.notValid = [];
            };

            $scope.resetOne = function (item) {

                function removeItemFromArray(item, array) {
                    if(!item || !angular.isArray(array)) {
                        return;
                    }
                    var indexOf = array.indexOf(item);
                    if(indexOf === -1) { return; }
                    array.splice(indexOf, 1);
                }

                if(!item) { return; }
                removeItemFromArray(item, $scope.nameChecks.all);
                if(item.isValid()) {
                    removeItemFromArray(item, $scope.nameChecks.valid);
                } else {
                    removeItemFromArray(item, $scope.nameChecks.notValid);
                }
            };

        }])

    ;

})(window.angular || {});
