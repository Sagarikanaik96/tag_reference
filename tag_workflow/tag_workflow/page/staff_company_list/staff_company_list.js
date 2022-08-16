// this file for TG-2607
frappe.pages['staff_company_list'].on_page_load = function (wrapper) {
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
				let favourite_companies = await sorted_favourite_company()
				for(let p in data){
					let check = favourite_companies.message.includes(data[p].name);
					if(check){
						profile_html = await sorted_favourite_companies(data[p], profile_html);
					}
				}
				for(let p in data){
					let check = favourite_companies.message.includes(data[p].name);
					if(!check){
						profile_html = await sorted_favourite_companies(data[p], profile_html);
					}
				}
				$("#myTable").html(profile_html);
			}
		})
	},
})


async function sorted_favourite_companies(data, profile_html) {
		let link = data.name.split(' ').join('%');
		let datas = await get_favourites_list(data.name);
		profile_html += `<tr>
					<td>
					<svg ${datas.message === "True" ? "class='icon icon-sm liked'" : "class='icon icon-sm not-liked'"}cursor:pointer" onClick = setLike(this,"${link}")>
					<use class="like-icon" href="#icon-heart"></use>
					</svg>
					</td>
					<td ><a onclick=dynamic_route("${link}")>${data.name}</a></td>
					<td>${data.address || ''}</td>	
					<td>${data.city || ''}</td>
					<td>${data.state == null ? "" : data.state}</td>
					<td>${data.zip == null ? "" : data.zip}</td>
					<td>${data.average_rating == null ? "" : data.average_rating}</td>
					<td>${data.is_blocked ? "<td></td>" : '<td><button class="btn-primary" onclick=trigger_direct_order("' + link + '")>Place Direct Order</button></td>'}</td>
					</tr>`;
	return profile_html;
}

function dynamic_route(name) {
	let name1 = name.replace(/%/g, ' ');
	localStorage.setItem("company", name1);
	window.location.href = "/app/dynamic_page";
}

function setLike(event, company) {
	if (event.classList.contains('not-liked')) {
		event.style.fill = 'red'
		event.style.stroke = 'white'
		event.classList.remove('not-liked')
		event.classList.add('liked')
		favourite_company(company)
	} else {
		event.classList.remove('liked')
		event.classList.add('not-liked')
		event.style.fill = 'white'
		event.style.stroke = 'var(--gray-500)'
		unfavourite_company(company)
	}
}

function trigger_direct_order(staff_name) {
	staff_name = staff_name.split('%').join(' ')
	let doc = frappe.model.get_new_doc("Job Order");
	doc.company = frappe.boot.tag.tag_user_info.company;
	doc.staff_company = staff_name;
	doc.posting_date_time = frappe.datetime.now_date();
	frappe.set_route("Form", doc.doctype, doc.name);
}
function favourite_company(company) {
	let company_name = company.replaceAll("%", " ")
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
				frappe.msgprint("The " + company_name + " is added into Favourite successfully.")
			}
		}
	})
	return "True"
}

async function sorted_favourite_company() {
	let a = '';
	a = frappe.call({
		method: 'tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.sorted_favourite_companies',
		"freeze": true,
		"freeze_message": "<p><b>Adding Company into Favourites</b></p>",
		args: {
			'user_name': frappe.boot.tag.tag_user_info.company
		},
	})
	return a
}

function unfavourite_company(company) {
	let company_name = company.replaceAll("%", " ")
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
				frappe.msgprint("The " + company_name + " is removed successfully from favourites.")
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