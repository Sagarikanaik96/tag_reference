frappe.pages['staff_company_list'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Staff Company List',
		single_column: true
	});
	wrapper.face_recognition = new frappe.FaceRecognition(wrapper, page);
}
frappe.FaceRecognition = Class.extend({
		init: function(wrapper, page) {
			var me = this;
			this.parent = wrapper;
			this.page = this.parent.page;
			setTimeout(function() {
				me.setup(wrapper, page);
			}, 0);
		},
		setup: function(wrapper, page){
			var me = this;
			this.body = $('<div></div>').appendTo(this.page.main);
			$(frappe.render_template('staff_company_list', "")).appendTo(this.body);
			me.show_profile(wrapper,page);
		},
		show_profile: function(wrapper, page){
			frappe.call({
				method:"tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.comp",
				
				callback:function(r)
				{
					var comp_data=r.message
					const profile_html = `
									${comp_data.map((l,p) => `<tr>
										<td>${p+1}</td>
										<td><a href='${l.name}'>${l.name}</a></td>
										<td>${l.address}</td>
										<td>${l.city}</td>
										<td>${l.state}</td>
										<td>${l.zip}</td>	
										<td>${l.average_rating}</td>				
									</tr>`).join('')}`
					$("#myTable").html(profile_html);
				}
				})
		},
	})
	



