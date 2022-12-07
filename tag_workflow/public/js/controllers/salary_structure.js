frappe.ui.form.on('Salary Structure', {
	refresh: function(frm){
		let name = frm.doc.name.split("_")
		$("#navbar-breadcrumbs > li.disabled > a").html(name[0]) 
		$('h3[title = "'+frm.doc.name+'"]').html(name[0]) 
		check_payroll_perm()
	},
	setup:function(frm){
		frm.set_query("company", function() {
			return {
				"filters":[ ['Company', "organization_type", "in", ["Staffing" ]],['Company',"make_organization_inactive","=",0],['Company',"enable_payroll","=",1]]
			}
		});
	},
});