(function(window) {
/* Validation.js v0.1 (2009)
 * writen by Jared Grippe, jared@jaredgrippe.com
 *
 *--------------------------------------------------------------------------*/


var ValidationError = function(element, message){
  this.element = element;
  this.message = message+'';
};
ValidationError.prototype = new String();
ValidationError.prototype.valueOf = ValidationError.prototype.toString = function toString(){
  return (this.element.name || this.element.id || this.element.nodeName).replace(/(_|-)+/g,' ')+' '+this.message;
};


Form.Element.ValidationErrors = Class.create(Enumerable,{
  initialize: function(element){
    this.element = $(element);
    this.errors = [];
  },
  toObject: function(){ return this.toArray(); },
  toArray:  function(){ return $A(this.errors); },
  _each: function(iterator) {
    this.errors.each(iterator);
    return this;
  },
  clear: function(){
    this.errors.length = 0;
    return this;
  },
  add: function(error){
    this.errors.push(error);
    return this;
  },
  fullMessages: function(){
    var element = this.element;
    return this.map(function(message){
      return new ValidationError(element, message).toString();
    });
  }
});

Form.ValidationErrors = Class.create(Form.Element.ValidationErrors,{
  toArray: function(){
    var form = this.element;
    var errors = this.errors.map(function(message){ return new ValidationError(form, message); });
    form.getActiveElements().each(function(element){
      element.validationErrors().each(function(message){
        errors.push(new ValidationError(element, message));
      });
    });
    return errors;
  },
  _each: function(iterator) {
    var errors = this.toArray().concat();
    this.element.getActiveElements().each(function(element){
      errors.concat( element.validationErrors().toArray() );
    });
    errors._each(iterator);
    return this;
  },
  clear: function(){
    this.errors.length = 0;
    this.element.getActiveElements().each(function(element){
      element.validationErrors().clear();
    });
    return this;
  },
  on: function(element_name){
    var element;
    element = Object.isElement(element_name) ? element_name :
      this.element.down('*[name="'+element_name+'"]');
    return Object.isElement(element) ? element.validationErrors() : false;
  },
  fullMessages: function(){
    return this.map(function(error){
      return error.toString();
    });
  }
});


function validates(Type, element, validator){
  if (Object.isString(validator)){
    if (validator in Type.Validators){
      validator = Type.Validators[validator];
    }else{
      throw new TypeError('unable to find validator named "'+validator+'"');
    }
  }

  if (!Object.isFunction(validator))
    throw new Error('validator must be a function or a string');

  element.addValidator(validator);
  return element;
}

Object.extend(Form.Element.Methods,{
  /** FormElement#validators
    *
    * returns an array of the defined validators
    */
  addValidator: function addValidator(element, validator){
    element.retrieve('_validators', []).push(validator);
    return element;
  },

  /** FormElement#validators
    *
    * returns a clone of the validators array
    */
  removeValidator: function removeValidators(element, validator){
    element.store('_validators', element.retrieve('_validators', []).without(validator));
    return element;
  },

  /** FormElement#validates(validation | validation_name)
    *
    *
    */
  validates: validates.curry(Form.Element),

  validate: function(element){
    element.validationErrors().clear();
    element.retrieve('_validators', []).invoke('call', element, element.getValue());
    element.fire(
      'form:element:validation:'+((element.validationErrors().size() < 1) ? 'success' : 'failure'),
      {element:element},
      false
    );
    return element;
  },

  isValid: function isValid(element){
    return element.validate().validationErrors().size() < 1;
  },

  validationErrors: function validationErrors(element){
    return element._validation_errors || (element._validation_errors = new Form.Element.ValidationErrors(element));
  }

});



Object.extend(Form.Methods,{
  getActiveElements: function(form){
    return $(form).getElements().findAll(function(element){
      return (element.style.display !== 'none' && element.style.visibility !== 'hidden' && element.disabled !== true);
    });
  },


  addValidator: Form.Element.Methods.addValidator,
  removeValidator: Form.Element.Methods.removeValidator,

  validates: validates.curry(Form),

  validate: function validate(form){
    form.validationErrors().clear();
    var elements = form.getActiveElements();
    elements.invoke('isValid');
    form.retrieve('_validators', []).invoke('call', form, elements);
    form.fire(
      'form:validation:'+((form.validationErrors().size() < 1) ? 'success' : 'failure'),
      {form:form},
      true
    );
    return form;
  },

  isValid: function isValid(form){
    return form.validate().validationErrors().size() < 1;
  },

  validationErrors: function validationErrors(form){
    return form._validation_errors || (form._validation_errors = new Form.ValidationErrors(form));
  }
});


Element.addMethods();


// found this after a few google searches, there's probably a better one
var EMAIL_ADDRESS_REGEX = /^([A-Za-z0-9]{1,}([-_\.&'][A-Za-z0-9]{1,}){0,}){1,}@(([A-Za-z0-9]{1,}[-]{0,1})\.){1,}[A-Za-z]{2,6}$/;

Form.Validators = {
  // Example
  // passwordsMatch: function passwordsMatch(elements){
  //   if(!this.password.getValue() == this.password_confirmation.getValue())
  //     this.validationErrors().add('passwords must match');
  // },
};

Form.Element.Validators = {
  isBlank: function isBlank(value){
    if (!value.blank()) this.validationErrors().add('must be blank');
  },
  isNotBlank: function isNotBlank(value){
    if (value.blank()) this.validationErrors().add('cannot be blank');
  },
  isChecked: function isChecked(value){
    if (!this.checked) this.validationErrors().add('must be checked');
  },
  isNotChecked: function isNotChecked(value){
    if (this.checked) this.validationErrors().add('cannot be checked');
  },
  isEmailAddress: function isEmailAddress(value){
    if (!EMAIL_ADDRESS_REGEX.test(value))
      this.validationErrors().add('must be a valid email address');
  }
};

})(this);