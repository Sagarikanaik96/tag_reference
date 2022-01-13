frappe.listview_settings['User'] = {
	hide_name_column: true,
	refresh: function(listview){
		listview.$page.find(`div[data-fieldname="name"]`).addClass("hide");
		let view = listview;
		let children = view.$list_head_subject[0].children;
		for(var c in children){
			if(children[c].innerHTML && children[c].innerHTML.search("\n\t\t\t\t\t\n\t\t\t\t\t\t<span>Name</span>\n\t\t\t\t") >= 0){
				children[c].innerHTML = "\n\t\t\t\t\t\n\t\t\t\t\t\t<span>Email</span>\n\t\t\t\t";
			}
		}

		for (let i of view.data) {
			frappe.call({
				method:"tag_workflow.tag_workflow.doctype.employee_assign_name.employee_assign_name.employee_email_filter",
				args:{
					"email":i["name"]
				},
				callback:function(r){
					console.log(r)
					if (r.message.length > 1){
						listview.$page.find(`a[data-filter="company,=,${r.message[0]}"]`).addClass("indicator-pill green");
					}
				}
			});
		}
	}
};

frappe.ui.form.ControlPassword = frappe.ui.form.ControlData.extend({
	input_type: "password",
	make: function() {
		this._super();
	},
	make_input: function() {
		this._super();
		this.$wrapper.find(":input[type='password'][data-fieldtype='Password']").addClass("hidepassword");
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
