var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

// Define schema for user model
var userSchema = mongoose.Schema({
	local : {
		email : String,
		password : String,
	}
});

// Generate hash
userSchema.methods.generateHash = function(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// Check if password is valid
userSchema.methods.validPassword = function(password) {
	return bcrypt.compareSync(password, this.local.password);
};

// Create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);
