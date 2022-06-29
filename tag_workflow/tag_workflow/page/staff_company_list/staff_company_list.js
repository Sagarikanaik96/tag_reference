frappe.pages['staff_company_list'].on_page_load = function(wrapper) {
	let page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Staff Company List',
		single_column: true
	});
	wrapper.face_recognition = new frappe.FaceRecognition(wrapper, page);
}
frappe.FaceRecognition = Class.extend({
		init: function(wrapper, page) {
			let me = this;
			this.parent = wrapper;
			this.page = this.parent.page;
			setTimeout(function() {
				me.setup(wrapper, page);
			}, 0);
		},
		setup: function(wrapper, page){
			let me = this;
			this.body = $('<div></div>').appendTo(this.page.main);
			$(frappe.render_template('staff_company_list', "")).appendTo(this.body);
			me.show_profile(wrapper,page);
		},
		show_profile: function(_wrapper, _page){
			frappe.call({
				method:"tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.comp",
				args:{
					company_name:frappe.boot.tag.tag_user_info.company,
				},
				
				callback:function(r){
					let data = r.message;
					let profile_html = ``;
					for(let p in data){
						let link = data[p].name.split(' ').join('%');
						profile_html += `<tr>
						<td>${parseInt(p)+1}</td>
						<td ><a onclick=dynamic_route("${link}")>${data[p].name}</a></td>
						<td>${data[p].address == null ? "" : data[p].address}</td>
						<td>${data[p].city == null ? "" : data[p].city}</td>
						<td>${data[p].state == null ? "" : data[p].state}</td>
						<td>${data[p].zip == null ? "" : data[p].zip}</td>
						<td>${data[p].average_rating == null ? "": data[p].average_rating}</td>
						<td>${data[p].is_blocked ? "<td></td>": '<td><button class="btn-primary" onclick=trigger_direct_order("'+link+'")>Place Direct Order</button></td>'}</td>
						</tr>`;

						
					}
					$("#myTable").html(profile_html);
				}
				})
		},
	})


function dynamic_route(name){
	let name1= name.replace(/%/g, ' ');
	localStorage.setItem("company", name1);
	window.location.href = "/app/dynamic_page";
}

function trigger_direct_order(staff_name){
	staff_name = staff_name.split('%').join(' ')
	let doc = frappe.model.get_new_doc("Job Order");
	doc.company = frappe.boot.tag.tag_user_info.company;
	doc.staff_company = staff_name;
	doc.posting_date_time = frappe.datetime.now_date();
	frappe.set_route("Form", doc.doctype, doc.name);
}