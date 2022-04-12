frappe.listview_settings['User'] = {
	onload: function(){
		$('[data-fieldname="email"]').hide()
		$('[data-fieldname="username"]').hide()
		$('h3[title="User"]').html('Company Users');
		cur_list.columns[4].df.label = 'Role'
		cur_list.render_header(cur_list.columns[4])
		$('[data-original-title="Role Profile"]').attr('data-original-title',"Role")
		$('[data-fieldname="role_profile_name"]').attr('placeholder',"Role")
		if(frappe.session.user!='Administrator'){
			$('.custom-actions.hidden-xs.hidden-md').hide();
			$('[data-original-title="Refresh"]').hide();
			$('.menu-btn-group').hide();
		}
    },
	hide_name_column: true,
	refresh: function(listview){
		$('#navbar-breadcrumbs > li > a').html('Company Users');
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
