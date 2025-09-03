// src/pages/HelpPage.jsx
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    List,
    ListItem,
    ListItemText,
    Container,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const helpSections = [
    {
        category: 'Security and Account',
        questions: [
        {
            q: 'What if I forgot my password?',
            a: 'On the login page, click Forgot password and check your email for a token (valid for a short time).'
        },
        {
            q: 'How can I manage my MFA (multi-factor authentication) ',
            a: 'Go to Account → Security, enable MFA, and scan the QR code with an authenticator app. Please remember or note down your recovery code. You can disable MFA anytime in the same place.'
        },
        {
            q: 'What if I lost my device with the authenticator application for MFA?',
            a: 'When asked to enter OTP, click "lost device" then enter your recovery code to disable your MFA.'
        }
        ],
    },
    {
        category: 'Workout and Routine related',
        questions: [
        {
            q: 'How can I quickly start a workout?',
            a: 'Click on the green button "start" on the start page to initialize an empty workout session. You can add any exercises in session.'
        },
        {
            q: 'How can I edit the workout history I have already uploaded?',
            a: 'Please go to calendar page, find the date of that workout on the calendar and click on the corresponding tile on that date. You can then view and edit the details of that workout in a dialog.'
        },
        {
            q: 'How to create and reuse routines?',
            a: 'You can create routine either from the routine section in start page or from a previous workout. You will need to give your routine name and you can use it later in the "custom routine" section in start page'
        },
        ],
    },
    {
        category: 'Exercise base and customization',
        questions: [
        {
            q: 'How can I search and add exercise?',
            a: 'When you are in an ongoing session or editing previous workout, you can select exercises from a separate dialog. You can search exercises on the top of that dialog.'
        },
        {
            q: 'How can I make my own exercise?',
            a: 'In Exercise Page, click on add custom, in the dialog enter related information to create your own exercise. You can later edit its note and instruction or delete it.'
        },
        ],
    },
    {
        category: 'Progress and Analysis',
        questions: [
        {
            q: 'How can I track my progress?',
            a: 'There are two ways to track your progress. One is through the Progress Page, your yearly and monthly volume change is displayed there. If you also want to view your progress of a single exercise, you can enter the exercise detail page from either exercise base or an ongoing session.'
        },
        {
            q: 'How can I make use of the progress charts?',
            a: 'You can hover your mouse on the graph to see the specific volume. You can use the embedded mini calendar to quickly jump to a specific month'
        },
        ],
    },
    {
        category: 'Instructor related',
        questions: [
        {
            q: 'How can I invite others to become my instructor?',
            a: 'In instructor page, click on generate code and send the displayed code to the person. Ask them to enter the code by clicking on Accept Link button. Once they accepted the invite, you can see their user name in Your Instructors section'
        },
        {
            q: 'How can I become an instructor?',
            a: 'Simply click on the "become instructor" button in Instructor page, If you are already an instructor, the button will become accept link.'
        },
        {
            q: "As an instructor, how can I view my trainee's training history and make comments?",
            a: 'You can click on the username of that person in the Your trainees section in Instructor page. Then you shall see the calendar and progress chart of that trainee. Click on a tile of a specific date to view their workout record and add comments.'
        },
        ],
    },
];

export default function HelpPage() {
    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
            Common Questions
        </Typography>
        {helpSections.map(section => (
            <Accordion key={section.category} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{section.category}</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <List dense>
                {section.questions.map(({ q, a }, index) => (
                    <ListItem key={index} alignItems="flex-start" sx={{ mb: 1 }}>
                    <ListItemText
                        primary={
                        <Typography variant="subtitle1" fontWeight="bold">
                            {q}
                        </Typography>
                        }
                        secondary={
                        <Typography variant="body2" color="text.secondary">
                            {a}
                        </Typography>
                        }
                    />
                    </ListItem>
                ))}
                </List>
            </AccordionDetails>
            </Accordion>
        ))}
        </Container>
    );
}
