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

            var fieldValue = request.params[paramName];

            if(isValidId(fieldValue)) {
                next();
            }
            else {
                response.status(400).send({
                    message : 'The param \''+paramName+'\' with value \''+fieldValue+'\' is not a valid ID.'
                });
            }

        }

    }

    function checkExist(modelName, fieldName, fieldValue, populate) {

        var promise = new Promise(function(resolve, reject) {

            var conditions = {};
            conditions[fieldName] = fieldValue;

            var query = mongoose.model(modelName)
                .findOne(conditions);

            if(populate) {
                query.populate(populate);
            }
            
            query
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

            if(!paramName || !modelName) {
                return response.status(500).send({
                    message : 'Missing parameters in the middleware.'
                });
            }

            var fieldName  = (options.fieldName && (typeof options.fieldName === 'string') ) ? options.fieldName : '_id';
            var fieldValue = request.params[paramName];
            
            if( (fieldName === '_id') && !isValidId(fieldValue) ) {
                return response.status(400).send({
                    message : 'The param \''+paramName+'\' with value \''+fieldValue+'\' is not a valid ID.'
                });
            }

            var populate  = (options.populate && (typeof options.populate === 'string') ) ? options.populate : null;
            
            checkExist(modelName, fieldName, fieldValue, populate)
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
                        response.status(404).send({
                            message : 'The resource \''+modelName+'\' with the field \''+fieldName+'\' having value \''+fieldValue+'\' does not exist.'
                        });
                    }

                })
                .catch(function(error) {
                    response.status(500).send(error);
                });

        }

    }

}

module.exports = new mongoValidation();