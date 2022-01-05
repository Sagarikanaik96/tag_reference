frappe.listview_settings['User'] = {
	refresh: function(listview){
		listview.$page.find(`div[data-fieldname="name"]`).addClass("hide");

		let view = listview;

		let children = view.$list_head_subject[0].children;

		for(var c in children){

			
			if(children[c].innerHTML && children[c].innerHTML.search("\n\t\t\t\t\t\n\t\t\t\t\t\t<span>Name</span>\n\t\t\t\t") >= 0){
				children[c].innerHTML = "\n\t\t\t\t\t\n\t\t\t\t\t\t<span>Email</span>\n\t\t\t\t";
			}
		}

		
	},

	// onload: function(listview){


        
 //    },
};

frappe.ui.form.ControlPassword = frappe.ui.form.ControlData.extend({
	input_type: "password",
	make: function() {
		this._super();
	},
	make_input: function() {
		var me = this;
		this._super();
		this.$wrapper.find(":input[type='password'][data-fieldtype='Password']").addClass("hidepassword")
		this.$input.parent().append($('<span class="input-area" > <input type="checkbox"  id="showPassword"  data-fieldtype=Check autocomplete="off" class="input-with-feedback-showPassword" ></span>'));
		this.$input.parent().append($('<span class="label-area">Show Password</span>'));

		$("#showPassword").click( function() {
    	if ($(".hidepassword").attr("type") == "password") {
			$(".hidepassword").attr("type", "text");
			
		} else {
			$(".hidepassword").attr("type", "password");
			
		}
		});

	}


});












