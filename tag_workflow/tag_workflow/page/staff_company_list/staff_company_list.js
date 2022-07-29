frappe.pages['staff_company_list'].on_page_load = function(wrapper) {
	let page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Staff Company List',
		single_column: true
	});
	wrapper.face_recognition = new frappe.FaceRecognition(wrapper, page);
}
frappe.FaceRecognition = Class.extend({
	init: function (wrapper, page) {
		let me = this;
		this.parent = wrapper;
		this.page = this.parent.page;
		setTimeout(function () {
			me.setup(wrapper, page);
		}, 0);
	},
	setup: function (wrapper, page) {
		let me = this;
		this.body = $('<div></div>').appendTo(this.page.main);
		$(frappe.render_template('staff_company_list', "")).appendTo(this.body);
		me.show_profile(wrapper, page);
	},
	show_profile: function (_wrapper, _page) {
		frappe.call({
			method: "tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.comp",
			args: {
				company_name: frappe.boot.tag.tag_user_info.company,
			},
			callback: async function (r) {
				let data = r.message;
				let profile_html = ``;
				for (let p in data) {
					let link = data[p].name.split(' ').join('%');
					let datas = await get_favourites_list(data[p].name)
					profile_html += `<tr>
						<td><i class="fa fa-heart demo" id="like-btn" style ="${datas.message === "True" ? "color:red" : "color:grey"};cursor:pointer" onClick = ${datas.message === "False" ? `favourite_company("${link}")` : `unfavourite_company("${link}")`} aria-hidden="true"></td>
						<td ><a onclick=dynamic_route("${link}")>${data[p].name}</a></td>
						<td>${data[p].address || ''}</td>	
						<td>${data[p].city || ''}</td>
						<td>${data[p].state == null ? "" : data[p].state}</td>
						<td>${data[p].zip == null ? "" : data[p].zip}</td>
						<td>${data[p].average_rating == null ? "" : data[p].average_rating}</td>
						<td>${data[p].is_blocked ? "<td></td>" : '<td><button class="btn-primary" onclick=trigger_direct_order("' + link + '")>Place Direct Order</button></td>'}</td>
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
function favourite_company(company) {
	let company_name = company.replace("%", " ")
	frappe.call({
		method: 'tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.favourite_company',
		"freeze": true,
		"freeze_message": "<p><b>Adding Company into Favourites</b></p>",
		args: {
			'company_to_favourite': company_name,
			'user_name': frappe.boot.tag.tag_user_info.company
		},
		callback: function (r) {
			if (r.message == "True") {
				location.reload(true);
				frappe.msgprint("The " + company + " is added into Favourite successfully.")
			}
		}
	})
	return "True"
}

function unfavourite_company(company) {
	let company_name = company.replace("%", " ")
	frappe.call({
		method: 'tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.unfavourite_company',
		"freeze": true,
		"freeze_message": "<p><b>Removing Company from Favourites</b></p>",
		args: {
			'company_to_favourite': company_name,
			'user_name': frappe.boot.tag.tag_user_info.company
		},
		callback: async function (r) {
			if (r.message == "False") {
				location.reload(true);
				frappe.msgprint("The " + company + " is removed successfully from favourites.")
				return "False"
			}
		}
	})
	return "True"
}


async function get_favourites_list(company) {
	let a = '';
	if (frappe.boot.tag.tag_user_info.company_type == 'Hiring') {
		a = frappe.call({
			method: 'tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.checking_favourites_list',
			args: {
				'company_to_favourite': company,
				'user_name': frappe.boot.tag.tag_user_info.company
			}
		})
	}
	return a
} 