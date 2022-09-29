frappe.listview_settings['User'] = {
	onload: function(listview){		
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

		const df = {
            condition: "=",
            default: null,
            fieldname: "organization_type",
            fieldtype: "Select",
            input_class: "input-xs",
            is_filter: 1,
            onchange: function() {
                cur_list.refresh();
            },
			options: ["","Exclusive Hiring", "Hiring", "Staffing", "TAG"],
            placeholder: "Company Type"
        };		

		const df1 = {
            condition: "=",
            default: null,
            fieldname: "role_profile_name",
            fieldtype: "Select",
            input_class: "input-xs",
            is_filter: 1,
            onchange: function() {
                cur_list.refresh();
            },
			options: get_role_profile1(),
            placeholder: "Role"
        };
		
		const df2 = {
            condition: "=",
            default: null,
            fieldname: "company",
            fieldtype: "Select",
            input_class: "input-xs",
            is_filter: 1,
            onchange: function() {
                cur_list.refresh();
            },
			options: get_organization_type(),
            placeholder: "Company"
        };

		let standard_filters_wrapper = listview.page.page_form.find('.standard-filter-section');
        listview.page.add_field(df, standard_filters_wrapper);
		listview.page.add_field(df1, standard_filters_wrapper);
        listview.page.add_field(df2, standard_filters_wrapper);

    },
	hide_name_column: true,
	refresh: function(listview){

	$('#navbar-breadcrumbs > li > a').html('Company Users');
	listview.$page.find(`div[data-fieldname="name"]`).addClass("hide");
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

function get_organization_type(){
	let text='\n'

	frappe.call({
		"method": "tag_workflow.utils.whitelisted.get_organization_type",
		args: {
			"user_type":frappe.boot.tag.tag_user_info.company_type
		},
		"async": 0,
		"callback": function(r){
			if(r.message){
				text += r.message
			}
		}
	});
	return text

}

function get_role_profile1(){
	let text='\n'

	frappe.call({
		"method": "tag_workflow.utils.whitelisted.get_role_profile",
		"async": 0,
		"callback": function(r1){
			if(r1.message){
				text += r1.message
			}
		}
	});
	return text

}
