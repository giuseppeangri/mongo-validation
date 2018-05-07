var mongoose = require('mongoose');

function mongoValidation() {

    var mongoValidation = this;

    mongoValidation.isValidId            = isValidId;
    mongoValidation.isValidIdMiddleware  = isValidIdMiddleware;
    mongoValidation.checkExist           = checkExist;
    mongoValidation.checkExistMiddleware = checkExistMiddleware;

    return mongoValidation;

    function isValidId(mongoId) {

        if(mongoose.Types.ObjectId.isValid(mongoId)) {
            return true;
        }
        else {
            return false;
        }

    }

    function isValidIdMiddleware(paramName) {

        return function(request, response, next) {

            var paramValue = request.params[paramName];

            if(isValidId(paramValue)) {
                next();
            }
            else {
                response.status(400).send({
                    message : 'The param: \''+paramName+'\' with value \''+paramValue+'\' is not a valid ID.'
                });
            }

        }

    }

    function checkExist(mongoId, modelName) {

        var promise = new Promise(function(resolve, reject) {

            mongoose.model(modelName)
                .findById(mongoId)
                .exec()
                .then(function(result) {
                    resolve(result);
                })
                .catch(function(error) {
                    reject(error);
                });
        
        });

        return promise;

    }

    function checkExistMiddleware(paramName, modelName, options) {

        options = options || {};

        return function(request, response, next) {

            var paramValue = request.params[paramName];

            if(isValidId(paramValue)) {

                checkExist(paramValue, modelName)
                    .then(function(result) {
                        
                        if(result) {

                            var appendToRequest = (options.appendToRequest === false) ? false : true;
                            var aggregate       = (options.aggregate === false) ? false : true;
                            var aggregateName   = (options.aggregateName && (typeof options.aggregateName === 'string') ) ? options.aggregateName : 'data';
                            var objectName      = (options.objectName && (typeof options.objectName === 'string') ) ? options.objectName : modelName.toLowerCase();

                            if(appendToRequest) {
                                
                                if(aggregate && !request[aggregateName]) {
                                    request[aggregateName] = {};
                                }

                                (aggregate) ? request[aggregateName][objectName] = result : request[objectName] = result;

                            }

                            next();

                        }
                        else {
                            response.status(400).send({
                                message : 'The resource: \''+modelName+'\' with ID \''+paramValue+'\' does not exist.'
                            });
                        }

                    })
                    .catch(function(error) {
                        response.status(500).send(error);
                    });

            }
            else {
                response.status(400).send({
                    message : 'The param: \''+paramName+'\' with value \''+paramValue+'\' is not a valid ID.'
                });
            }

        }

    }

}

module.exports = new mongoValidation();