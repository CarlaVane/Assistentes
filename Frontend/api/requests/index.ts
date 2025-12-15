// Exportar todas as funções de requisição para facilitar importação

// Auth
export {
    loginRequest,
    registerRequest,
    logoutRequest,
    requestPasswordResetRequest,
    resetPasswordRequest,
} from "./auth";

// Médicos
export {
    listMedicosRequest,
    getMedicoRequest,
    createMedicoRequest,
    updateMedicoRequest,
    deleteMedicoRequest,
} from "./medicos";

// Sintomas
export {
    listSintomasRequest,
    getSintomaRequest,
    createSintomaRequest,
    updateSintomaRequest,
    deleteSintomaRequest,
    listMockSintomasRequest,
    matchSymptomsNlpRequest,
} from "./sintomas";

// Consultas
export {
    listConsultasRequest,
    getConsultaRequest,
    createConsultaRequest,
    updateConsultaRequest,
    deleteConsultaRequest,
    approveConsultaRequest,
    cancelConsultaRequest,
    markConsultaAsDoneRequest,
    diagnoseConsultaRequest,
    getValidatedReportsRequest,
    makeConsultaRequest,
    getPendingConsultasRequest,
    validateDiagnosisRequest,
    getConsultaRecommendationsRequest,
} from "./consultas";// Consulta-Sintomas
export {
    listConsultaSintomasRequest,
    createConsultaSintomaRequest,
    deleteConsultaSintomaRequest,
} from "./consultaSintomas";

// Pacientes
export {
    listPacientesRequest,
    getPacienteRequest,
    createPacienteRequest,
    updatePacienteRequest,
    deletePacienteRequest,
    getPacienteDetailsRequest,
    getPacienteHistoryRequest,
    getPacienteSymptomsRequest,
} from "./pacientes";

// Doenças
export {
    listDoencasRequest,
} from "./doenca";

// Users
export {
    listUsersRequest,
    getUserRequest,
    createUserRequest,
    updateUserRequest,
    deleteUserRequest,
    changePasswordRequest,
} from "./users";
