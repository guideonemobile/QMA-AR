
#import "QMACyclopsVC.h"
#import "EAGLView.h"

@interface QMACyclopsVC ()

@property (nonatomic, weak) IBOutlet EAGLView *glView;

@end


static NSString *const kTrackingDataFileName = @"TrackingData_MarkerlessFast";
static NSString *const kTrackingDataFilePath = @"_Targets/";

static NSString *const kOverlayingImage = @"frame";
static NSString *const kOverlayingImageFilePath = @"_Targets/";

static NSString *const kFileTypeXML = @"xml";
static NSString *const kFileTypePNG = @"png";


@implementation QMACyclopsVC {
    
    metaio::IGeometry *m_imagePlane;
    
}


- (void)viewDidLoad {
    
    [super viewDidLoad];
    
    //Load target tracking configuration file
    
    NSString *trackingDataFile = [[NSBundle mainBundle] pathForResource:kTrackingDataFileName
																 ofType:kFileTypeXML
															inDirectory:kTrackingDataFilePath];
    
    if (!trackingDataFile) {
        QMALog(@"Error opening %@ file", kTrackingDataFileName);
    
    } else {
        bool success = m_metaioSDK->setTrackingConfiguration([trackingDataFile UTF8String]);
        if (!success) {
            QMALog(@"Error loading the tracking configuration");
        }
    }
    
    //Load image to superimpose on identified target
    
    NSString *imagePath = [[NSBundle mainBundle] pathForResource:kOverlayingImage
														  ofType:kFileTypePNG
													 inDirectory:kOverlayingImageFilePath];
    
    if (imagePath) {
        m_imagePlane = m_metaioSDK->createGeometryFromImage([imagePath UTF8String]);
		if (!m_imagePlane) {
            QMALog(@"Error loading %@ overlaying image", kOverlayingImage);
		} else {
            m_imagePlane->setScale(metaio::Vector3d(3.0,3.0,3.0));
        }
    }
}

@end
