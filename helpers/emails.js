const Sequelize = require('sequelize');
const { PROJECT_STATUS } = require('../constants');
const Op = Sequelize.Op;
const {
    Project,
    Finance
  } = require('../models');
const emailSender = require('../helpers/mailSender');

module.exports.sendNewUpdatesNotificationToSponsors = async (projectId) => {
    try {
    const project = await Project.findByPk(projectId, {
        attributes: [
            'name',
            'url'
        ],
        where: {
            status: PROJECT_STATUS.LIVE,
            [Op.and]: [
                {
                    url: {
                        [Op.ne]: null
                    }
                },
                {
                    url: {
                        [Op.ne]: ''
                    }
                }
            ]
        }
    });

    if (!project) {
        return;
    }

    const sponsors = await Finance.findAll({
        where: {
            project_id: projectId,
            is_info_sharable: true,
            [Op.and]: [
                {
                    email: {
                        [Op.ne]: null
                    }
                },
                {
                    email: {
                        [Op.ne]: ''
                    }
                },
                {
                    full_name: {
                        [Op.ne]: null
                    }
                },
                {
                    full_name: {
                        [Op.ne]: ''
                    }
                }
            ]
        },
        attributes: [
            'full_name',
            'email'
        ],
        raw: true
    });

    const sendingPromises = sponsors.map(async (sponsor) => {
       return new emailSender().sendMail(
            [sponsor.email],
            `${project.name} posted new updates`,
            ' ',
            'GoFundHer',
            ' ',
            'projectNewUpdates', {
                sponsorName: sponsor.full_name,
                projectName: project.name,
                projectLink: `${process.env.FRONTEND_URL}/${project.url}`
            },
            true,
        )
    });

    await Promise.all(sendingPromises);
} catch(error){
    console.log(error);
}

}