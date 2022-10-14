frappe.ui.form.on('Salary Structure', {
	refresh: function(frm){
		let name = frm.doc.name.split("_")
		$("#navbar-breadcrumbs > li.disabled > a").html(name[0]) 
		$('h3[title = "'+frm.doc.name+'"]').html(name[0]) 
	}
});