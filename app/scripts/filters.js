(function(angular) {
    'use strict';

    angular.module('app.filters', [])

        .filter('activeVotes', ['voteService', function(voteService) {

            function isVoteActive(vote) {
                if(!vote || !angular.isObject(vote)) {
                    return false;
                }

                if(vote.isLocked === true) {
                    return false;
                }

                return voteService.isVoteOpened(vote);
            }

            return function(array) {
                if(!angular.isArray(array)) {
                    return array;
                }
                var filtered = [];
                for(var i = 0; i < array.length; i++) {
                    var value = array[i];
                    if(isVoteActive(value)) {
                        filtered.push(value);
                    }
                }

                return filtered;
            };
        }])


    ;
})(window.angular || {});