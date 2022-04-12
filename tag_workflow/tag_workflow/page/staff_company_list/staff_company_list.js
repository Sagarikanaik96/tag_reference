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
				args:{
					company_name:frappe.boot.tag.tag_user_info.company,
				},
				
				callback:function(r){

					var data = r.message;
					let profile_html = ``;
					for(let p in data){
						let link = data[p].name.split(' ').join('%');
						profile_html += `<tr>
							<td>${parseInt(p)+1}</td>
							<td ><a onclick=dynamic_route("${link}")>${data[p].name}</a></td>
							<td>${data[p].address}</td>
							<td>${data[p].city}</td>
							<td>${data[p].state}</td>
							<td>${data[p].zip}</td>
							<td>${data[p].average_rating}</td>
							</tr>`;

						
					}
					$("#myTable").html(profile_html);
				}
				})
		},
	})


function dynamic_route(name){
	var name1= name.replace(/%/g, ' ');
	localStorage.setItem("company", name1);
	window.location.href = "/app/dynamic_page";
}
